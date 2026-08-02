import { NextRequest, NextResponse } from 'next/server'
import { countProducts, upsertProducts } from '@/lib/db/products'
import { getPool } from '@/lib/mysql'
import type { RowDataPacket } from 'mysql2/promise'

const BASE_URL = 'https://api.arogga.com/general/v3/search'
const PER_PAGE = 100
const PAGE_CONCURRENCY = 2   // pages fetched/upserted in parallel
const WRITE_CONCURRENCY = 3  // products upserted in parallel within a page
const FETCH_RETRIES = 3

interface ApiResponse {
  status: string
  total: number
  data: Record<string, unknown>[]
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchPage(page: number, attempt = 0): Promise<ApiResponse> {
  const url = `${BASE_URL}?_page=${page}&_perPage=${PER_PAGE}`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json() as ApiResponse
  } catch (err) {
    if (attempt < FETCH_RETRIES) {
      await sleep(500 * (attempt + 1))
      return fetchPage(page, attempt + 1)
    }
    throw new Error(`Page ${page} failed after ${FETCH_RETRIES} retries: ${(err as Error).message}`)
  }
}

// GET /api/sync — returns current DB stats
export async function GET() {
  try {
    const count = await countProducts()
    const pool = getPool()
    const [rows] = await pool.query<(RowDataPacket & { p_name: string; updated_at: string })[]>(
      'SELECT p_name, updated_at FROM products ORDER BY updated_at DESC LIMIT 1'
    )
    return NextResponse.json({ count, newest: rows[0] ?? null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/sync — fetches every product from the upstream catalog and
// upserts it into MySQL (matched by p_id; variants matched by pv_id).
// Streams progress as NDJSON so the dashboard can show a live progress bar.
//
// The upstream `total` count can be larger than what its pagination actually
// serves (it may silently start returning empty pages while still reporting
// the full total). That's not a "some rows failed" situation — it means the
// crawl can no longer make progress, so the whole run stops immediately and
// reports a `stopped` event instead of quietly finishing as if it succeeded.
export async function POST(req: NextRequest) {
  const { startPage = 1 } = await req.json().catch(() => ({}))

  const encoder = new TextEncoder()
  const stream = new TransformStream<Uint8Array, Uint8Array>()
  const writer = stream.writable.getWriter()

  const send = (obj: Record<string, unknown>) =>
    writer.write(encoder.encode(JSON.stringify(obj) + '\n'))

  ;(async () => {
    try {
      await send({ event: 'connected' })

      const first = await fetchPage(startPage)
      const total = first.total
      const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

      let grandInserted = 0
      let grandUpdated = 0
      let grandSkipped = 0
      let grandErrors = 0
      let done = 0
      let stopReason: string | null = null
      let stopPage: number | null = null

      const applyResult = (r: { inserted: number; updated: number; skipped: number; errors: number }) => {
        grandInserted += r.inserted
        grandUpdated += r.updated
        grandSkipped += r.skipped
        grandErrors += r.errors
      }
      const progressPayload = () => ({
        done, totalPages, total,
        inserted: grandInserted, updated: grandUpdated, skipped: grandSkipped, errors: grandErrors,
      })
      const emptyPageIssue = (page: number) =>
        `Upstream returned 0 products for page ${page}, but reports ${total.toLocaleString()} total products ` +
        `across ${totalPages} pages. It has stopped serving more data than this — the crawl cannot make further ` +
        `progress. Fetched ${grandInserted + grandUpdated} of ${total.toLocaleString()} products before this happened.`

      if (first.data.length === 0) {
        await send({ ...progressPayload(), event: 'stopped', reason: emptyPageIssue(startPage), page: startPage })
        return
      }
      applyResult(await upsertProducts(first.data, WRITE_CONCURRENCY))
      done = 1
      await send({ ...progressPayload(), event: 'progress' })

      const tasks = Array.from({ length: totalPages - startPage }, (_, i) => startPage + i + 1)

      let idx = 0
      async function worker() {
        while (idx < tasks.length && !stopReason) {
          const page = tasks[idx++]
          if (stopReason) break

          let json: ApiResponse
          try {
            json = await fetchPage(page)
          } catch (err) {
            stopReason = `Page ${page} failed: ${(err as Error).message}. Fetched ${grandInserted + grandUpdated} of ${total.toLocaleString()} products before this happened.`
            stopPage = page
            break
          }

          if (json.data.length === 0) {
            stopReason = emptyPageIssue(page)
            stopPage = page
            break
          }

          applyResult(await upsertProducts(json.data, WRITE_CONCURRENCY))
          done++
          await send({ ...progressPayload(), event: 'progress' })
        }
      }
      await Promise.all(Array.from({ length: PAGE_CONCURRENCY }, worker))

      if (stopReason) {
        await send({ ...progressPayload(), event: 'stopped', reason: stopReason, page: stopPage })
      } else {
        const count = await countProducts()
        await send({ ...progressPayload(), event: 'done', count })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await send({ event: 'error', message })
    } finally {
      await writer.close()
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
