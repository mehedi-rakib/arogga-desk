/**
 * Removes duplicate products by p_id — keeps the latest inserted document.
 * Run: npx tsx scripts/dedup.ts
 */

import 'dotenv/config'
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) { console.error('❌  MONGODB_URI not set'); process.exit(1) }

async function main() {
  await mongoose.connect(MONGODB_URI!, { dbName: 'arogga', bufferCommands: false })
  console.log(`✔  Connected — db: ${mongoose.connection.name}`)

  const db = mongoose.connection.db!
  const col = db.collection('products')

  const before = await col.countDocuments()
  console.log(`   Documents before: ${before}`)

  // Find p_ids that appear more than once
  const dupes: { _id: number; ids: mongoose.Types.ObjectId[] }[] = await col
    .aggregate([
      { $group: { _id: '$p_id', ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray() as never

  if (!dupes.length) {
    console.log('✔  No duplicates found.')
    await mongoose.disconnect()
    return
  }

  console.log(`   Found ${dupes.length} p_id(s) with duplicates`)

  let deleted = 0
  for (const { ids } of dupes) {
    // Sort ObjectIds descending so index 0 = most recently inserted
    ids.sort((a, b) => (a.toString() > b.toString() ? -1 : 1))
    const toDelete = ids.slice(1) // keep ids[0], delete the rest
    const r = await col.deleteMany({ _id: { $in: toDelete } })
    deleted += r.deletedCount
  }

  const after = await col.countDocuments()
  console.log(`✔  Deleted ${deleted} duplicate(s). Documents after: ${after}`)
  await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
