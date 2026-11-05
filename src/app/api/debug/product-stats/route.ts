import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getPool } from '@/lib/mysql'
import { RowDataPacket } from 'mysql2/promise'

interface StatusCount extends RowDataPacket {
  p_active_status: string | null
  total: number
  with_variants: number
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pool = getPool()

    // Get product counts by status
    const [statusRows] = await pool.query<StatusCount[]>(`
      SELECT
        p_active_status,
        COUNT(*) as total,
        SUM(CASE WHEN EXISTS (SELECT 1 FROM product_variants WHERE product_variants.p_id = products.p_id) THEN 1 ELSE 0 END) as with_variants
      FROM products
      GROUP BY p_active_status
      ORDER BY total DESC
    `)

    // Get products without variants
    const [noVariants] = await pool.query<Array<RowDataPacket & { count: number }>>(
      `SELECT COUNT(*) as count FROM products WHERE p_id NOT IN (SELECT DISTINCT p_id FROM product_variants)`
    )

    // Get total active products
    const [activeCount] = await pool.query<Array<RowDataPacket & { count: number }>>(
      `SELECT COUNT(*) as count FROM products WHERE p_active_status = 'active'`
    )

    // Get total with variants
    const [variantCount] = await pool.query<Array<RowDataPacket & { count: number }>>(
      `SELECT COUNT(DISTINCT p_id) as count FROM product_variants`
    )

    return NextResponse.json({
      byStatus: statusRows,
      totalInDB: statusRows.reduce((sum, row) => sum + (row.total || 0), 0),
      activeProducts: activeCount[0]?.count || 0,
      productsWithVariants: variantCount[0]?.count || 0,
      productsWithoutVariants: noVariants[0]?.count || 0,
    })
  } catch (error) {
    console.error('Error fetching debug stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
