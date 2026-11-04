import { NextRequest, NextResponse } from 'next/server'
import { countProducts, upsertProducts } from '@/lib/db/products'

const BASE_URL = 'https://api.arogga.com/general/v3/search'
const PER_PAGE = 100
const CAP = 1000              // API pagination ceiling — branch before hitting it
const MAX_TERM_LENGTH = 5     // hard stop on how deep a search term can be refined
const REQUEST_DELAY_MS = 200  // pacing between upstream requests
const WRITE_CONCURRENCY = 3
const FETCH_RETRIES = 3
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('')

interface ApiResponse {
  status: string
  total: number
  data: Record<string, unknown>[]
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchSearch(term: string | null, page: number, attempt = 0): Promise<ApiResponse> {
  const url = new URL(BASE_URL)
  url.searchParams.set('_page', String(page))
  url.searchParams.set('_perPage', String(PER_PAGE))
  if (term) url.searchParams.set('_search', term)
  try {
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json() as ApiResponse
  } catch (err) {
    if (attempt < FETCH_RETRIES) {
      await sleep(500 * (attempt + 1))
      return fetchSearch(term, page, attempt + 1)
    }
    throw new Error(`term=${term ?? '(none)'} page=${page}: ${(err as Error).message}`)
  }
}

// POST /api/sync/deep — best-effort full-catalog crawl.
//
// The upstream search API truncates plain pagination at roughly 1,000 items
// no matter how large `total` is. But `_search` genuinely narrows the result
// set, and appending a character to a search term can only ever narrow it
// further (a product matching "ab" always also matches "a"). So: start from
// broad single-character terms; whenever a term's own total still exceeds
// the ~1,000 cap, don't bother paginating it (it would just truncate the
// same way) — instead branch into 36 children (term + each letter/digit) and
// let those narrower queries reach the parts of the catalog this term's
// pagination can't. Terms narrow enough to fully paginate get fully ingested.
//
// This cannot guarantee 100% coverage (a product with no distinctive English
// substring across name/generic name/brand name could be missed), but reaches
// far more than plain pagination's ~1,000-item ceiling.
export async function POST(req: NextRequest) {
  const { maxRequests = 5000 } = await req.json().catch(() => ({}))

  const encoder = new TextEncoder()
  const stream = new TransformStream<Uint8Array, Uint8Array>()
  const writer = stream.writable.getWriter()
  const send = (obj: Record<string, unknown>) => writer.write(encoder.encode(JSON.stringify(obj) + '\n'))

  ;(async () => {
    try {
      await send({ event: 'connected' })

      const seen = new Set<number>()
      let requests = 0
      let termsExplored = 0
      let termsConsumed = 0
      let inserted = 0, updated = 0, skipped = 0, errors = 0

      const addDocs = (docs: Record<string, unknown>[]) => {
        for (const d of docs) {
          const pid = Number(d.p_id ?? d.id)
          if (pid) seen.add(pid)
        }
      }
      const applyResult = (r: { inserted: number; updated: number; skipped: number; errors: number }) => {
        inserted += r.inserted; updated += r.updated; skipped += r.skipped; errors += r.errors
      }

      // Authoritative catalog size (unfiltered) — used only as the coverage
      // denominator, since a search term's own `total` is scoped to itself.
      const overview = await fetchSearch(null, 1)
      requests++
      const catalogTotal = overview.total
      addDocs(overview.data)
      applyResult(await upsertProducts(overview.data, WRITE_CONCURRENCY))

      const queue: string[] = [...ALPHABET]
      const visited = new Set(queue)

      const progressPayload = (currentTerm: string) => ({
        currentTerm, queueSize: queue.length, termsExplored, termsConsumed,
        uniqueFound: seen.size, catalogTotal, requests,
        inserted, updated, skipped, errors,
      })

      while (queue.length > 0 && requests < maxRequests) {
        const term = queue.shift()!
        termsExplored++

        let first: ApiResponse
        try {
          first = await fetchSearch(term, 1)
          requests++
        } catch {
          await send({ ...progressPayload(term), event: 'progress' })
          continue
        }

        if (first.total > 0) {
          if (first.total <= CAP || term.length >= MAX_TERM_LENGTH) {
            // Narrow enough (or hit max depth) — fully ingest what's reachable.
            addDocs(first.data)
            applyResult(await upsertProducts(first.data, WRITE_CONCURRENCY))

            const maxPages = Math.ceil(CAP / PER_PAGE) + 1  // +1 to detect truncation
            let lastPageHadData = true
            for (let p = 2; p <= maxPages && lastPageHadData && requests < maxRequests; p++) {
              await sleep(REQUEST_DELAY_MS)
              try {
                const json = await fetchSearch(term, p)
                requests++
                if (json.data.length === 0) {
                  lastPageHadData = false
                } else {
                  addDocs(json.data)
                  applyResult(await upsertProducts(json.data, WRITE_CONCURRENCY))
                }
              } catch {
                break
              }
            }
            termsConsumed++
          } else {
            // Still too broad — branch into children instead of paginating.
            for (const ch of ALPHABET) {
              const child = term + ch
              if (!visited.has(child)) {
                visited.add(child)
                queue.push(child)
              }
            }
          }
        }

        await sleep(REQUEST_DELAY_MS)
        await send({ ...progressPayload(term), event: 'progress' })
      }

      const count = await countProducts()
      await send({
        event: 'done', count, uniqueFound: seen.size, catalogTotal, requests,
        termsExplored, termsConsumed, inserted, updated, skipped, errors,
        stoppedOnBudget: queue.length > 0,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      try {
        await send({ event: 'error', message })
      } catch {
        // Stream may already be closed
      }
    } finally {
      try {
        await writer.close()
      } catch {
        // Stream already closed — this is fine
      }
    }
  })()

  return new NextResponse(stream.readable as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-store',
      'Transfer-Encoding': 'chunked',
    },
  })
}
