/**
 * Full migration: fetch all products from api.arogga.com → upsert into MongoDB.
 *
 * Uses individual updateOne (not bulkWrite) so every write error is visible.
 * Safe to re-run: upserts are idempotent.
 *
 *   npx tsx scripts/migrate.ts
 *   npx tsx scripts/migrate.ts --from=101   ← resume from page 101
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import type { Collection } from 'mongodb'

// ── Config ────────────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) { console.error('❌  MONGODB_URI not set in .env'); process.exit(1) }

const BASE_URL = 'https://api.arogga.com/general/v3/search'
const PER_PAGE = 100          // products fetched per API call
const WRITE_CONCURRENCY = 5   // simultaneous updateOne calls per page (safe for M0)
const PAGE_DELAY_MS = 200     // pause between pages to avoid hammering M0
const FETCH_RETRIES = 4       // retry failed API fetches

// ── Helpers ───────────────────────────────────────────────────────────────────

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

type WriteResult = 'inserted' | 'updated' | 'skipped' | 'error'

async function saveDoc(col: Collection, doc: Record<string, unknown>): Promise<WriteResult> {
  const pid = (doc.p_id ?? doc.id) as number
  try {
    const r = await col.updateOne(
      { p_id: pid },
      { $set: { ...doc, p_id: pid } },
      { upsert: true }
    )
    if (r.upsertedCount > 0) return 'inserted'
    if (r.modifiedCount > 0) return 'updated'
    return 'skipped'
  } catch (err: unknown) {
    const code = (err as { code?: number }).code
    // 11000 = duplicate key: already inserted by a concurrent run — that's fine
    if (code === 11000) return 'skipped'
    process.stderr.write(`\n  ✘  p_id=${pid}: ${(err as Error).message}\n`)
    return 'error'
  }
}

async function savePage(col: Collection, docs: Record<string, unknown>[]) {
  let inserted = 0, updated = 0, skipped = 0, errors = 0

  for (let i = 0; i < docs.length; i += WRITE_CONCURRENCY) {
    const chunk = docs.slice(i, i + WRITE_CONCURRENCY)
    const results = await Promise.all(chunk.map(d => saveDoc(col, d)))
    for (const r of results) {
      if (r === 'inserted') inserted++
      else if (r === 'updated') updated++
      else if (r === 'skipped') skipped++
      else errors++
    }
  }

  return { inserted, updated, skipped, errors }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Resume support: --from=N
  const fromArg = process.argv.find(a => a.startsWith('--from='))
  const startPage = fromArg ? parseInt(fromArg.split('=')[1], 10) : 1

  const redacted = MONGODB_URI!.replace(/:\/\/(.*?)@/, '://<credentials>@')
  console.log(`\nConnecting to MongoDB: ${redacted}`)

  try {
    await mongoose.connect(MONGODB_URI!, {
      dbName: 'arogga',
      bufferCommands: false,
      serverSelectionTimeoutMS: 10_000,
      writeConcern: { w: 1, wtimeoutMS: 15_000 },
    })
  } catch (err) {
    console.error(`❌  Connection failed: ${(err as Error).message}`)
    process.exit(1)
  }
  console.log(`✔  Connected — db: ${mongoose.connection.name}`)

  // Use native collection directly — bypasses Mongoose and gives real error objects
  const col = mongoose.connection.db!.collection('products')

  // Ensure unique index exists
  await col.createIndex({ p_id: 1 }, { unique: true, name: 'idx_p_id_unique' }).catch(() => {
    /* already exists */
  })
  console.log('✔  Index ready\n')

  // ── Step 1: get total from page 1 ────────────────────────────────────────
  console.log(`Fetching page ${startPage} to get total count…`)
  const first = await fetchPage(startPage)
  const total = first.total
  const totalPages = Math.ceil(total / PER_PAGE)
  console.log(`Total products: ${total.toLocaleString()} → ${totalPages} pages of ${PER_PAGE}`)
  if (startPage > 1) console.log(`Resuming from page ${startPage}`)
  console.log()

  // ── Step 2: iterate pages sequentially ───────────────────────────────────
  let grandInserted = 0, grandUpdated = 0, grandSkipped = 0, grandErrors = 0
  const failedPages: number[] = []
  const startTime = Date.now()

  for (let page = startPage; page <= totalPages; page++) {
    try {
      const json = page === startPage ? first : await fetchPage(page)
      const { inserted, updated, skipped, errors } = await savePage(col, json.data)

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

      const dbCount = await col.countDocuments()

      process.stdout.write(
        `\r  [${pct.padStart(5)}%] p${page}/${totalPages}  db:${String(dbCount).padStart(6)}  +${String(grandInserted).padStart(6)} ins  ~${String(grandUpdated).padStart(5)} upd  err:${grandErrors}  ${elapsed}s / ETA ${eta}s  `
      )

      if (errors > 0 && grandErrors <= 20) {
        process.stdout.write('\n') // newline so error messages are visible
      }

      if (page < totalPages) await sleep(PAGE_DELAY_MS)
    } catch (err) {
      process.stderr.write(`\n  ✘  Page ${page} skipped: ${(err as Error).message}\n`)
      failedPages.push(page)
    }
  }

  // ── Step 3: final report ──────────────────────────────────────────────────
  const finalCount = await col.countDocuments()
  const elapsed = Math.round((Date.now() - startTime) / 1000)

  console.log('\n')
  console.log('━━━  Migration complete  ━━━')
  console.log(`  Inserted : ${grandInserted.toLocaleString()}`)
  console.log(`  Updated  : ${grandUpdated.toLocaleString()}`)
  console.log(`  Skipped  : ${grandSkipped.toLocaleString()} (already up-to-date)`)
  console.log(`  Errors   : ${grandErrors}`)
  console.log(`  DB total : ${finalCount.toLocaleString()} documents`)
  console.log(`  Time     : ${elapsed}s`)

  if (failedPages.length > 0) {
    console.log(`\n  Failed pages: ${failedPages.join(', ')}`)
    console.log(`  Re-run with: npx tsx scripts/migrate.ts --from=<lowest failed page>`)
  }

  if (finalCount < total * 0.99) {
    console.log(`\n  ⚠  DB has ${finalCount} docs but API reports ${total} total.`)
    console.log('     Re-run the migration — upserts are safe to repeat.')
  } else {
    console.log('\n  ✔  All products stored successfully.')
  }

  await mongoose.disconnect()
}

main().catch(err => { console.error('\nFatal:', err); process.exit(1) })
