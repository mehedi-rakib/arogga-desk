import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const COOKIE = 'auth_token'

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    const message = 'AUTH_SECRET environment variable is required'
    if (process.env.NODE_ENV === 'production') {
      throw new Error(message)
    }
    console.warn(
      `⚠️  ${message} - using fallback for development only. Set AUTH_SECRET in production!`
    )
    return 'fallback-dev-secret-change-in-production-32ch'
  }
  if (secret.length < 32) {
    console.warn(
      '⚠️  AUTH_SECRET should be at least 32 characters for production security'
    )
  }
  return secret
}

const secret = new TextEncoder().encode(getAuthSecret())

export interface Session {
  email: string
}

export async function signToken(payload: Session): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as Session
  } catch {
    return null
  }
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export function getTokenFromRequest(req: NextRequest): string | undefined {
  return req.cookies.get(COOKIE)?.value
}

export const COOKIE_NAME = COOKIE
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
}
