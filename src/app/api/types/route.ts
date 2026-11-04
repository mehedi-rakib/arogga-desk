import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import mysql, { RowDataPacket } from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  database: process.env.MYSQL_DATABASE || 'aroggo',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conn = await pool.getConnection()
    const [rows] = await conn.query<RowDataPacket[]>(`
      SELECT DISTINCT p_type
      FROM products
      WHERE p_type IS NOT NULL AND p_type != ''
      ORDER BY p_type ASC
    `)
    conn.release()

    const types = (rows as Array<{ p_type: string | null }>)
      .map(row => row.p_type || '')
      .filter((t, i, arr) => t && arr.indexOf(t) === i)
      .sort()

    return NextResponse.json({ data: types })
  } catch (error) {
    console.error('Error fetching types:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
