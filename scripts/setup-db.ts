/**
 * DB setup: verifies MongoDB connection, creates collections & indexes.
 * Run BEFORE migrate: npx tsx scripts/setup-db.ts
 */

import 'dotenv/config'
import mongoose, { Connection } from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI is not set in .env')
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ok(msg: string) { console.log(`  ✔  ${msg}`) }
function fail(msg: string) { console.error(`  ✘  ${msg}`) }
function info(msg: string) { console.log(`  ·  ${msg}`) }

async function ensureCollection(db: Connection['db'], name: string) {
  if (!db) throw new Error('No db connection')
  const existing = await db.listCollections({ name }).toArray()
  if (existing.length === 0) {
    await db.createCollection(name)
    ok(`Created collection "${name}"`)
  } else {
    info(`Collection "${name}" already exists`)
  }
}

async function ensureIndexes(db: Connection['db']) {
  if (!db) throw new Error('No db connection')
  const col = db.collection('products')

  // 1. Unique index on p_id (primary lookup key)
  await col.createIndex({ p_id: 1 }, { unique: true, name: 'idx_p_id_unique' })
  ok('Index: products.p_id (unique)')

  // 2. Compound text index for full-text search
  await col.createIndex(
    {
      p_name: 'text',
      p_name_bn: 'text',
      p_generic_name: 'text',
      p_brand_name: 'text',
    },
    {
      weights: { p_name: 10, p_generic_name: 5, p_brand_name: 3, p_name_bn: 2 },
      name: 'idx_text_search',
      default_language: 'none', // disable stemming — better for Bangla + brand names
    }
  )
  ok('Index: products text (p_name × 10, p_generic_name × 5, p_brand_name × 3, p_name_bn × 2)')

  // 3. Trending score — used for default sort when no search term
  await col.createIndex({ p_trending_score: -1 }, { name: 'idx_trending_score' })
  ok('Index: products.p_trending_score (desc)')

  // 4. Active status filter
  await col.createIndex({ p_active_status: 1 }, { name: 'idx_active_status' })
  ok('Index: products.p_active_status')

  // 5. Order count — used for "most ordered" sort
  await col.createIndex({ productCountOrdered: -1 }, { name: 'idx_ordered_count' })
  ok('Index: products.productCountOrdered (desc)')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n━━━  Arogga DB Setup  ━━━\n')

  // ── 1. Connection test ─────────────────────────────────────────────────────
  console.log('1. Connecting to MongoDB…')
  const redacted = MONGODB_URI!.replace(/:\/\/(.*?)@/, '://<credentials>@')
  info(`URI: ${redacted}`)

  let conn: typeof mongoose
  try {
    conn = await mongoose.connect(MONGODB_URI!, {
      dbName: 'arogga',
      bufferCommands: false,
      serverSelectionTimeoutMS: 10_000,
    })
    ok(`Connected — host: ${conn.connection.host}`)
    ok(`Database: ${conn.connection.name}`)
  } catch (err) {
    fail(`Connection failed: ${(err as Error).message}`)
    process.exit(1)
  }

  const db = conn.connection.db
  if (!db) {
    fail('No database handle — check your MONGODB_URI includes a database name')
    process.exit(1)
  }

  // ── 2. Collections ─────────────────────────────────────────────────────────
  console.log('\n2. Ensuring collections…')
  try {
    await ensureCollection(db, 'products')
  } catch (err) {
    fail(`Collection setup failed: ${(err as Error).message}`)
    await mongoose.disconnect()
    process.exit(1)
  }

  // ── 3. Indexes ─────────────────────────────────────────────────────────────
  console.log('\n3. Ensuring indexes…')
  try {
    await ensureIndexes(db)
  } catch (err) {
    fail(`Index setup failed: ${(err as Error).message}`)
    await mongoose.disconnect()
    process.exit(1)
  }

  // ── 4. Verify ──────────────────────────────────────────────────────────────
  console.log('\n4. Verification…')
  const indexList = await db.collection('products').indexes()
  info(`Total indexes on "products": ${indexList.length}`)
  for (const idx of indexList) {
    info(`  ${idx.name}: ${JSON.stringify(idx.key)}`)
  }

  const docCount = await db.collection('products').countDocuments()
  info(`Current document count: ${docCount}`)

  // ── 5. Done ────────────────────────────────────────────────────────────────
  console.log('\n━━━  Setup complete  ━━━')
  console.log('\nNext step:')
  console.log('  npm run migrate\n')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('\nFatal:', err)
  process.exit(1)
})
