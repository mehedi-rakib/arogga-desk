/**
 * Downloads all products from api.arogga.com and saves them as local JSON chunks.
 *
 *   npx tsx scripts/download.ts
 *   npx tsx scripts/download.ts --from=101   ← resume from page 101
 *
 * Output:
 *   data/products/chunk-000.json   (products 0–999)
 *   data/products/chunk-001.json   (products 1000–1999)
 *   ...
 *   data/meta.json                 (total count, chunk count, downloaded-at)
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'https://api.arogga.com/general/v3/search'
const PER_PAGE = 100          // products per API call
const CHUNK_SIZE = 1_000      // products per JSON file
const CONCURRENCY = 4         // simultaneous API requests
const DELAY_MS = 150          // ms between batches
const FETCH_RETRIES = 4

const DATA_DIR = path.resolve(process.cwd(), 'data', 'products')

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchPage(page: number, attempt = 0): Promise<{ total: number; data: unknown[] }> {
  const url = `${BASE_URL}?_page=${page}&_perPage=${PER_PAGE}`
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch (err) {
    if (attempt < FETCH_RETRIES) {
      await sleep(1000 * (attempt + 1))
      return fetchPage(page, attempt + 1)
    }
    throw new Error(`Page ${page} failed after ${FETCH_RETRIES} retries: ${(err as Error).message}`)
  }
}

function saveChunk(chunkIndex: number, products: unknown[]) {
  const file = path.join(DATA_DIR, `chunk-${String(chunkIndex).padStart(3, '0')}.json`)
  fs.writeFileSync(file, JSON.stringify(products, null, 0), 'utf-8')
  return file
}

function saveMeta(total: number, chunks: number) {
  const meta = {
    total,
    chunks,
    chunkSize: CHUNK_SIZE,
    perPage: PER_PAGE,
    downloadedAt: new Date().toISOString(),
  }
  fs.writeFileSync(path.resolve(process.cwd(), 'data', 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const fromArg = process.argv.find(a => a.startsWith('--from='))
  const startPage = fromArg ? parseInt(fromArg.split('=')[1], 10) : 1

  // Ensure output directory exists
  fs.mkdirSync(DATA_DIR, { recursive: true })

  console.log(`\n━━━  Arogga Product Download  ━━━`)
  console.log(`Output: ${DATA_DIR}\n`)

  // Page 1 to get total
  console.log(`Fetching page ${startPage} to get total count…`)
  const first = await fetchPage(startPage)
  const total = first.total as number
  const totalPages = Math.ceil(total / PER_PAGE)
  const totalChunks = Math.ceil(total / CHUNK_SIZE)
  console.log(`Total products : ${total.toLocaleString()}`)
  console.log(`API pages      : ${totalPages} × ${PER_PAGE}`)
  console.log(`JSON chunks    : ${totalChunks} × ${CHUNK_SIZE} products\n`)

  // Buffer accumulates products until we have a full chunk
  const buffer: unknown[] = []
  let chunkIndex = Math.floor(((startPage - 1) * PER_PAGE) / CHUNK_SIZE)
  let totalDownloaded = (startPage - 1) * PER_PAGE
  let totalSaved = 0
  const failedPages: number[] = []
  const startTime = Date.now()

  // Load existing buffer if resuming mid-chunk
  if (startPage > 1) {
    const chunkFile = path.join(DATA_DIR, `chunk-${String(chunkIndex).padStart(3, '0')}.json`)
    if (fs.existsSync(chunkFile)) {
      const existing: unknown[] = JSON.parse(fs.readFileSync(chunkFile, 'utf-8'))
      const keepCount = ((startPage - 1) * PER_PAGE) % CHUNK_SIZE
      buffer.push(...existing.slice(0, keepCount))
      console.log(`  Resuming chunk-${chunkIndex} with ${buffer.length} existing products`)
    }
  }

  // Enqueue pages
  const pageQueue: number[] = []
  for (let p = startPage; p <= totalPages; p++) pageQueue.push(p)

  let qIdx = 0

  async function worker() {
    while (qIdx < pageQueue.length) {
      const page = pageQueue[qIdx++]
      try {
        const json = page === startPage ? first : await fetchPage(page)
        const products = json.data as unknown[]

        buffer.push(...products)
        totalDownloaded += products.length

        // Flush complete chunks
        while (buffer.length >= CHUNK_SIZE) {
          const chunk = buffer.splice(0, CHUNK_SIZE)
          saveChunk(chunkIndex, chunk)
          totalSaved += chunk.length
          chunkIndex++
        }

        const pct = ((totalDownloaded / total) * 100).toFixed(1)
        const elapsed = Math.round((Date.now() - startTime) / 1000)
        const eta = totalDownloaded > 0
          ? Math.round(((Date.now() - startTime) / totalDownloaded) * (total - totalDownloaded) / 1000)
          : '?'

        process.stdout.write(
          `\r  [${pct.padStart(5)}%] ${totalDownloaded.toLocaleString()}/${total.toLocaleString()} products  saved: ${totalSaved.toLocaleString()}  ${elapsed}s / ETA ${eta}s   `
        )

        await sleep(DELAY_MS)
      } catch (err) {
        process.stderr.write(`\n  ✘  Page ${page}: ${(err as Error).message}\n`)
        failedPages.push(page)
      }
    }
  }

  // Run workers concurrently
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  // Flush remaining buffer (last partial chunk)
  if (buffer.length > 0) {
    saveChunk(chunkIndex, buffer)
    totalSaved += buffer.length
    chunkIndex++
  }

  // Save metadata
  saveMeta(total, chunkIndex)

  // Final report
  console.log('\n')
  console.log('━━━  Download complete  ━━━')
  console.log(`  Products downloaded : ${totalDownloaded.toLocaleString()}`)
  console.log(`  Products saved      : ${totalSaved.toLocaleString()}`)
  console.log(`  Chunk files         : ${chunkIndex} (chunk-000.json … chunk-${String(chunkIndex - 1).padStart(3, '0')}.json)`)
  console.log(`  Location            : ${DATA_DIR}`)

  if (failedPages.length > 0) {
    console.log(`\n  ⚠  Failed pages: ${failedPages.join(', ')}`)
    console.log(`     Re-run: npx tsx scripts/download.ts --from=${Math.min(...failedPages)}`)
  } else {
    console.log('\n  ✔  All pages downloaded successfully.')
    console.log('\nNext steps:')
    console.log('  1. npm run dev  ← app now serves from local JSON files')
    console.log('  2. npm run upload-to-db  ← push local files to MySQL (optional)')
  }
}

main().catch(err => { console.error('\nFatal:', err); process.exit(1) })
