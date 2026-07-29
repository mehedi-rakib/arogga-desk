'use client'

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const email = emailRef.current?.value ?? ''
    const password = passwordRef.current?.value ?? ''

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (res.ok) {
      router.push(params.get('from') ?? '/dashboard')
    } else {
      const j = await res.json()
      setError(j.error ?? 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontWeight: 700, fontSize: 26, letterSpacing: '-.03em' }}>
            price<span style={{ color: 'var(--b2b)' }}>·</span>desk
          </div>
          <div style={{ font: '400 11px/1 var(--mono)', letterSpacing: '.18em', color: 'var(--dim)', textTransform: 'uppercase', marginTop: 6 }}>
            arogga catalog
          </div>
        </div>

        <form onSubmit={submit} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Sign in</h1>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ font: '500 11px/1 var(--mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--dim)' }}>Email</span>
            <input
              ref={emailRef}
              type="email"
              required
              autoComplete="email"
              placeholder="admin@example.com"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 14px', fontSize: 14, color: 'var(--text)', outline: 'none' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--b2b)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ font: '500 11px/1 var(--mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--dim)' }}>Password</span>
            <input
              ref={passwordRef}
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 14px', fontSize: 14, color: 'var(--text)', outline: 'none' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--b2b)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)' }}
            />
          </label>

          {error && (
            <div style={{ font: '500 12px/1.4 var(--mono)', color: 'var(--alert)', padding: '9px 12px', background: 'rgba(255,107,107,.08)', borderRadius: 7, border: '1px solid rgba(255,107,107,.2)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ background: 'var(--b2b)', color: '#06251c', fontWeight: 700, padding: '13px', borderRadius: 9, fontSize: 14, opacity: loading ? 0.6 : 1, marginTop: 4 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
