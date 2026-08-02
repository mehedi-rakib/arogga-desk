/**
 * Full migration: fetch all products from api.arogga.com → upsert into MySQL.
 * Safe to re-run: upserts are idempotent (p_id is the primary key).
 *
 *   npx tsx scripts/migrate.ts
 *   npx tsx scripts/migrate.ts --from=101   ← resume from page 101
 */

import 'dotenv/config'
import { upsertProducts, countProducts } from '../src/lib/db/products'
import { getPool } from '../src/lib/mysql'

const BASE_URL = 'https://api.arogga.com/general/v3/search'
const PER_PAGE = 100
const WRITE_CONCURRENCY = 5
const PAGE_DELAY_MS = 200
const FETCH_RETRIES = 4

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchPage(page: number, attempt = 0): Promise<{ total: number; data: Record<string, unknown>[] }> {
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
      await sleep(800 * (attempt + 1))
      return fetchPage(page, attempt + 1)
    }
    throw new Error(`Page ${page} failed after ${FETCH_RETRIES} retries: ${(err as Error).message}`)
  }
}

async function main() {
  const fromArg = process.argv.find(a => a.startsWith('--from='))
  const startPage = fromArg ? parseInt(fromArg.split('=')[1], 10) : 1

  console.log(`\nConnecting to MySQL: ${process.env.MYSQL_DATABASE}@${process.env.MYSQL_HOST ?? 'localhost'}`)
  const pool = getPool()
  await pool.query('SELECT 1')
  console.log('✔  Connected\n')

  console.log(`Fetching page ${startPage} to get total count…`)
  const first = await fetchPage(startPage)
  const total = first.total
  const totalPages = Math.ceil(total / PER_PAGE)
  console.log(`Total products: ${total.toLocaleString()} → ${totalPages} pages of ${PER_PAGE}`)
  if (startPage > 1) console.log(`Resuming from page ${startPage}`)
  console.log()

  let grandInserted = 0, grandUpdated = 0, grandSkipped = 0, grandErrors = 0
  const failedPages: number[] = []
  const startTime = Date.now()

  for (let page = startPage; page <= totalPages; page++) {
    try {
      const json = page === startPage ? first : await fetchPage(page)
      const { inserted, updated, skipped, errors } = await upsertProducts(json.data, WRITE_CONCURRENCY)

      grandInserted += inserted
      grandUpdated += updated
      grandSkipped += skipped
      grandErrors += errors

      const pct = (((page - startPage + 1) / (totalPages - startPage + 1)) * 100).toFixed(1)
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      const pagesLeft = totalPages - page
      const eta = page > startPage
        ? Math.round(((Date.now() - startTime) / (page - startPage + 1)) * pagesLeft / 1000)
        : '?'

      process.stdout.write(
        `\r  [${pct.padStart(5)}%] p${page}/${totalPages}  +${String(grandInserted).padStart(6)} ins  ~${String(grandUpdated).padStart(5)} upd  err:${grandErrors}  ${elapsed}s / ETA ${eta}s  `
      )

      if (page < totalPages) await sleep(PAGE_DELAY_MS)
    } catch (err) {
      process.stderr.write(`\n  ✘  Page ${page} skipped: ${(err as Error).message}\n`)
      failedPages.push(page)
    }
  }

  const finalCount = await countProducts()
  const elapsed = Math.round((Date.now() - startTime) / 1000)

  console.log('\n')
  console.log('━━━  Migration complete  ━━━')
  console.log(`  Inserted : ${grandInserted.toLocaleString()}`)
  console.log(`  Updated  : ${grandUpdated.toLocaleString()}`)
  console.log(`  Skipped  : ${grandSkipped.toLocaleString()} (already up-to-date)`)
  console.log(`  Errors   : ${grandErrors}`)
  console.log(`  DB total : ${finalCount.toLocaleString()} products`)
  console.log(`  Time     : ${elapsed}s`)

  if (failedPages.length > 0) {
    console.log(`\n  Failed pages: ${failedPages.join(', ')}`)
    console.log(`  Re-run with: npx tsx scripts/migrate.ts --from=<lowest failed page>`)
  } else {
    console.log('\n  ✔  All products stored successfully.')
  }

  await pool.end()
}

main().catch(err => { console.error('\nFatal:', err); process.exit(1) })
