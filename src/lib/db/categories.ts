import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { getPool } from '@/lib/mysql'

interface LogoFile {
  s3key?: string
  src?: string
  title?: string
}

interface RawCategory {
  mi_cat_id: unknown
  mi_id?: unknown
  mi_name?: unknown
  mi_url?: unknown
  mi_has_child?: unknown
  mi_weight?: unknown
  attachedFiles_mi_logo?: LogoFile[]
}

interface CategoryRow extends RowDataPacket {
  mi_cat_id: number
  mi_id: number
  mi_name: string
  mi_url: string
  mi_has_child: number
  mi_weight: number
  logo_s3key: string
  logo_src: string | null
  logo_title: string
}

export interface Category {
  mi_cat_id: number
  mi_id: number
  mi_name: string
  mi_url: string
  mi_has_child: boolean
  mi_weight: number
  logo_s3key: string
  logo_src: string | null
  logo_title: string
}

const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const str = (v: unknown): string => (v == null ? '' : String(v))

function rowToCategory(row: CategoryRow): Category {
  return {
    mi_cat_id: row.mi_cat_id,
    mi_id: row.mi_id,
    mi_name: row.mi_name,
    mi_url: row.mi_url,
    mi_has_child: row.mi_has_child === 1,
    mi_weight: row.mi_weight,
    logo_s3key: row.logo_s3key,
    logo_src: row.logo_src,
    logo_title: row.logo_title,
  }
}

export async function upsertCategories(
  raw: RawCategory[],
  concurrency = 5
): Promise<{ inserted: number; updated: number; errors: number }> {
  const pool = getPool()
  let inserted = 0, updated = 0, errors = 0

  const chunks: RawCategory[][] = []
  for (let i = 0; i < raw.length; i += concurrency) {
    chunks.push(raw.slice(i, i + concurrency))
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (cat) => {
      const logo = cat.attachedFiles_mi_logo?.[0]
      try {
        const [res] = await pool.query<ResultSetHeader>(
          `INSERT INTO categories
             (mi_cat_id, mi_id, mi_name, mi_url, mi_has_child, mi_weight, logo_s3key, logo_src, logo_title)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             mi_id       = VALUES(mi_id),
             mi_name     = VALUES(mi_name),
             mi_url      = VALUES(mi_url),
             mi_has_child = VALUES(mi_has_child),
             mi_weight   = VALUES(mi_weight),
             logo_s3key  = VALUES(logo_s3key),
             logo_src    = VALUES(logo_src),
             logo_title  = VALUES(logo_title)`,
          [
            num(cat.mi_cat_id),
            num(cat.mi_id),
            str(cat.mi_name),
            str(cat.mi_url),
            num(cat.mi_has_child),
            num(cat.mi_weight),
            str(logo?.s3key),
            logo?.src ?? null,
            str(logo?.title),
          ]
        )
        if (res.affectedRows === 1) inserted++
        else updated++
      } catch {
        errors++
      }
    }))
  }

  return { inserted, updated, errors }
}

export async function countCategories(): Promise<number> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM categories')
  return Number(rows[0].cnt)
}

export async function getCategories(): Promise<Category[]> {
  const pool = getPool()
  const [rows] = await pool.query<CategoryRow[]>(
    'SELECT * FROM categories ORDER BY mi_weight DESC, mi_name ASC'
  )
  return rows.map(rowToCategory)
}

export async function getCategoryById(miCatId: number): Promise<Category | null> {
  const pool = getPool()
  const [rows] = await pool.query<CategoryRow[]>(
    'SELECT * FROM categories WHERE mi_cat_id = ?',
    [miCatId]
  )
  return rows[0] ? rowToCategory(rows[0]) : null
}
