/**
 * Uploads local JSON chunk files to MySQL.
 * Run AFTER download.ts completes.
 *
 *   npx tsx scripts/upload-to-db.ts
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { upsertProducts, countProducts } from '../src/lib/db/products'
import { getPool } from '../src/lib/mysql'

const DATA_DIR = path.resolve(process.cwd(), 'data', 'products')
const META_FILE = path.resolve(process.cwd(), 'data', 'meta.json')
const WRITE_CONCURRENCY = 10

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`❌  ${DATA_DIR} not found. Run "npm run download" first.`)
    process.exit(1)
  }

  const meta = fs.existsSync(META_FILE)
    ? JSON.parse(fs.readFileSync(META_FILE, 'utf-8'))
    : null

  const chunkFiles = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('chunk-') && f.endsWith('.json'))
    .sort()

  console.log(`\n━━━  Upload local JSON → MySQL  ━━━`)
  console.log(`  Chunks found : ${chunkFiles.length}`)
  if (meta) console.log(`  Total products (meta): ${meta.total?.toLocaleString()}`)
  console.log()

  console.log(`Connecting: ${process.env.MYSQL_DATABASE}@${process.env.MYSQL_HOST ?? 'localhost'}`)
  const pool = getPool()
  await pool.query('SELECT 1')
  console.log('✔  Connected\n')

  let grandInserted = 0, grandUpdated = 0, grandSkipped = 0, grandErrors = 0
  const startTime = Date.now()

  for (let i = 0; i < chunkFiles.length; i++) {
    const file = path.join(DATA_DIR, chunkFiles[i])
    const products: Record<string, unknown>[] = JSON.parse(fs.readFileSync(file, 'utf-8'))

    const { inserted, updated, skipped, errors } = await upsertProducts(products, WRITE_CONCURRENCY)
    grandInserted += inserted
    grandUpdated += updated
    grandSkipped += skipped
    grandErrors += errors

    const pct = (((i + 1) / chunkFiles.length) * 100).toFixed(1)
    const dbCount = await countProducts()
    const elapsed = Math.round((Date.now() - startTime) / 1000)

    process.stdout.write(
      `\r  [${pct.padStart(5)}%] ${chunkFiles[i]}  db:${dbCount.toLocaleString()}  +${grandInserted} ins  err:${grandErrors}  ${elapsed}s   `
    )

    await sleep(200)
  }

  const finalCount = await countProducts()
  const elapsed = Math.round((Date.now() - startTime) / 1000)

  console.log('\n')
  console.log('━━━  Upload complete  ━━━')
  console.log(`  Inserted : ${grandInserted.toLocaleString()}`)
  console.log(`  Updated  : ${grandUpdated.toLocaleString()}`)
  console.log(`  Skipped  : ${grandSkipped.toLocaleString()}`)
  console.log(`  Errors   : ${grandErrors}`)
  console.log(`  DB total : ${finalCount.toLocaleString()} products`)
  console.log(`  Time     : ${elapsed}s`)

  await pool.end()
}

main().catch(err => { console.error('\nFatal:', err); process.exit(1) })
