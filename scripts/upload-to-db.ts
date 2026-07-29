/**
 * Uploads local JSON chunk files to MongoDB.
 * Run AFTER download.ts completes.
 *
 *   npx tsx scripts/upload-to-db.ts
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import type { Collection } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) { console.error('❌  MONGODB_URI not set'); process.exit(1) }

const DATA_DIR = path.resolve(process.cwd(), 'data', 'products')
const META_FILE = path.resolve(process.cwd(), 'data', 'meta.json')
const WRITE_CONCURRENCY = 10  // simultaneous updateOne per chunk

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

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
    if (code === 11000) return 'skipped'
    process.stderr.write(`\n  ✘  p_id=${pid}: ${(err as Error).message}\n`)
    return 'error'
  }
}

async function uploadChunk(col: Collection, products: Record<string, unknown>[]) {
  let inserted = 0, updated = 0, skipped = 0, errors = 0
  for (let i = 0; i < products.length; i += WRITE_CONCURRENCY) {
    const chunk = products.slice(i, i + WRITE_CONCURRENCY)
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

  console.log(`\n━━━  Upload local JSON → MongoDB  ━━━`)
  console.log(`  Chunks found : ${chunkFiles.length}`)
  if (meta) console.log(`  Total products (meta): ${meta.total?.toLocaleString()}`)
  console.log()

  const redacted = MONGODB_URI!.replace(/:\/\/(.*?)@/, '://<credentials>@')
  console.log(`Connecting: ${redacted}`)

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
  console.log(`✔  Connected — db: ${mongoose.connection.name}\n`)

  const col = mongoose.connection.db!.collection('products')

  // Ensure unique index
  await col.createIndex({ p_id: 1 }, { unique: true, name: 'idx_p_id_unique' }).catch(() => {})

  let grandInserted = 0, grandUpdated = 0, grandSkipped = 0, grandErrors = 0
  const startTime = Date.now()

  for (let i = 0; i < chunkFiles.length; i++) {
    const file = path.join(DATA_DIR, chunkFiles[i])
    const products: Record<string, unknown>[] = JSON.parse(fs.readFileSync(file, 'utf-8'))

    const { inserted, updated, skipped, errors } = await uploadChunk(col, products)
    grandInserted += inserted
    grandUpdated += updated
    grandSkipped += skipped
    grandErrors += errors

    const pct = (((i + 1) / chunkFiles.length) * 100).toFixed(1)
    const dbCount = await col.countDocuments()
    const elapsed = Math.round((Date.now() - startTime) / 1000)

    process.stdout.write(
      `\r  [${pct.padStart(5)}%] ${chunkFiles[i]}  db:${dbCount.toLocaleString()}  +${grandInserted} ins  err:${grandErrors}  ${elapsed}s   `
    )

    await sleep(200)
  }

  const finalCount = await col.countDocuments()
  const elapsed = Math.round((Date.now() - startTime) / 1000)

  console.log('\n')
  console.log('━━━  Upload complete  ━━━')
  console.log(`  Inserted : ${grandInserted.toLocaleString()}`)
  console.log(`  Updated  : ${grandUpdated.toLocaleString()}`)
  console.log(`  Skipped  : ${grandSkipped.toLocaleString()}`)
  console.log(`  Errors   : ${grandErrors}`)
  console.log(`  DB total : ${finalCount.toLocaleString()} documents`)
  console.log(`  Time     : ${elapsed}s`)

  await mongoose.disconnect()
}

main().catch(err => { console.error('\nFatal:', err); process.exit(1) })
