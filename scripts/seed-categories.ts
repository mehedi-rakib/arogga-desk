/**
 * Seeds the categories table from a local JSON export.
 * Safe to re-run: upserts are idempotent (mi_cat_id is the primary key).
 *
 *   npx tsx scripts/seed-categories.ts
 *   npx tsx scripts/seed-categories.ts --file=path/to/other.json
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { upsertCategories, countCategories } from '../src/lib/db/categories'
import { getPool } from '../src/lib/mysql'

const DEFAULT_FILE = 'ceategory_api_arogga_com_2026-08-03T04-49-24-669Z.json'

async function main() {
  const fileArg = process.argv.find(a => a.startsWith('--file='))
  const filePath = fileArg
    ? path.resolve(fileArg.split('=')[1])
    : path.resolve(process.cwd(), DEFAULT_FILE)

  if (!fs.existsSync(filePath)) {
    console.error(`❌  File not found: ${filePath}`)
    process.exit(1)
  }

  console.log(`\n━━━  Seed Categories  ━━━`)
  console.log(`  File: ${filePath}`)

  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as { data: Record<string, unknown>[] }
  const categories = json.data
  console.log(`  Records: ${categories.length.toLocaleString()}\n`)

  console.log(`  Connecting: ${process.env.MYSQL_DATABASE}@${process.env.MYSQL_HOST ?? 'localhost'}`)
  const pool = getPool()
  await pool.query('SELECT 1')
  console.log('  ✔  Connected\n')

  const BATCH = 100
  let totalInserted = 0, totalUpdated = 0, totalErrors = 0
  const startTime = Date.now()

  for (let i = 0; i < categories.length; i += BATCH) {
    const batch = categories.slice(i, i + BATCH)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { inserted, updated, errors } = await upsertCategories(batch as any, 10)
    totalInserted += inserted
    totalUpdated += updated
    totalErrors += errors

    const done = Math.min(i + BATCH, categories.length)
    const pct = ((done / categories.length) * 100).toFixed(1)
    process.stdout.write(`\r  [${pct.padStart(5)}%] ${done}/${categories.length}  +${totalInserted} ins  ~${totalUpdated} upd  err:${totalErrors}   `)
  }

  const finalCount = await countCategories()
  const elapsed = Math.round((Date.now() - startTime) / 1000)

  console.log('\n')
  console.log('━━━  Done  ━━━')
  console.log(`  Inserted : ${totalInserted.toLocaleString()}`)
  console.log(`  Updated  : ${totalUpdated.toLocaleString()}`)
  console.log(`  Errors   : ${totalErrors}`)
  console.log(`  DB total : ${finalCount.toLocaleString()} categories`)
  console.log(`  Time     : ${elapsed}s`)

  await pool.end()
}

main().catch(err => { console.error('\nFatal:', err); process.exit(1) })
