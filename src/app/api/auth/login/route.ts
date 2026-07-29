import { NextRequest, NextResponse } from 'next/server'
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}))

  const validEmail = process.env.ADMIN_EMAIL
  const validPassword = process.env.ADMIN_PASSWORD

  if (!validEmail || !validPassword) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 })
  }

  if (email !== validEmail || password !== validPassword) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signToken({ email })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS)
  return res
}
