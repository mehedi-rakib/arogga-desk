import type { RowDataPacket } from 'mysql2/promise'
import { getPool } from '@/lib/mysql'

export type SettingType = 'string' | 'number' | 'boolean' | 'json'

export interface Setting {
  key: string
  value: string
  type: SettingType
  label: string
  description: string
}

interface SettingRow extends RowDataPacket {
  key: string
  value: string
  type: SettingType
  label: string
  description: string
}

export async function getAllSettings(): Promise<Setting[]> {
  const pool = getPool()
  const [rows] = await pool.query<SettingRow[]>(
    'SELECT `key`, `value`, `type`, label, description FROM settings ORDER BY `key`'
  )
  return rows
}

/** Updates only known settings keys; unknown keys are ignored. */
export async function updateSettings(values: Record<string, string>): Promise<void> {
  const pool = getPool()
  const entries = Object.entries(values)
  if (entries.length === 0) return

  await Promise.all(
    entries.map(([key, value]) =>
      pool.query('UPDATE settings SET `value` = ? WHERE `key` = ?', [value, key])
    )
  )
}
