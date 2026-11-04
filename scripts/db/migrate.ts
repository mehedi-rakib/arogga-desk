/**
 * Applies migrations/*.sql to MySQL in filename order, tracking what's been
 * applied in a `schema_migrations` table so re-runs are safe.
 *
 *   npx tsx scripts/db/migrate.ts
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations')

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    multipleStatements: true,
  })

  console.log(`\n━━━  MySQL Migrations  ━━━\n`)
  console.log(`  Database: ${process.env.MYSQL_DATABASE}@${process.env.MYSQL_HOST ?? 'localhost'}\n`)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  const [rows] = await conn.query('SELECT id FROM schema_migrations')
  const applied = new Set((rows as { id: string }[]).map(r => r.id))

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  let ranCount = 0
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  ·  ${file} (already applied)`)
      continue
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8')
    try {
      await conn.query(sql)
      await conn.query('INSERT INTO schema_migrations (id) VALUES (?)', [file])
      console.log(`  ✔  ${file}`)
      ranCount++
    } catch (err) {
      console.error(`  ✘  ${file}: ${(err as Error).message}`)
      await conn.end()
      process.exit(1)
    }
  }

  console.log(`\n━━━  Done — ${ranCount} migration(s) applied  ━━━\n`)
  await conn.end()
}

main().catch(err => { console.error('\nFatal:', err); process.exit(1) })
