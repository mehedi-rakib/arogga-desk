import { NextRequest, NextResponse } from 'next/server'
import { hash, compare } from 'bcryptjs'
import { getPool } from '@/lib/mysql'
import { RowDataPacket } from 'mysql2/promise'

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'change-this-secret-key-12345'

interface UserRow extends RowDataPacket {
  u_id: number
  u_password: string
}

export async function POST(req: NextRequest) {
  try {
    const { secret, oldPassword, newPassword } = await req.json()

    // Verify secret key
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Invalid admin key' }, { status: 403 })
    }

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const pool = getPool()

    // Get current admin password (assuming single admin user with id=1)
    const [users] = await pool.query<UserRow[]>(
      'SELECT u_id, u_password FROM users WHERE u_id = 1 LIMIT 1'
    )

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 500 })
    }

    const user = users[0]

    // Verify old password
    const isPasswordValid = await compare(oldPassword, user.u_password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 10)

    // Update password
    await pool.query('UPDATE users SET u_password = ? WHERE u_id = 1', [hashedPassword])

    return NextResponse.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
