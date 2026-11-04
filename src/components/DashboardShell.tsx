'use client'

import { usePathname, useRouter } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '▦' },
  { href: '/dashboard/products', label: 'Products', icon: '⊞' },
  { href: '/dashboard/orders', label: 'Orders', icon: '↑' },
  { href: '/dashboard/brands', label: 'Brands', icon: '◈' },
  { href: '/dashboard/sync', label: 'Sync', icon: '⟳' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙' },
]

export default function DashboardShell({ children, email }: { children: React.ReactNode; email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: 'var(--panel)',
        borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--line-soft)' }}>
          <div style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontWeight: 700, fontSize: 17, letterSpacing: '-.02em' }}>
            price<span style={{ color: 'var(--b2b)' }}>·</span>desk
          </div>
          <div style={{ font: '400 10px/1 var(--mono)', letterSpacing: '.16em', color: 'var(--dim)', textTransform: 'uppercase', marginTop: 4 }}>
            arogga catalog
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <a
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                  fontSize: 13.5, fontWeight: active ? 600 : 400,
                  color: active ? 'var(--text)' : 'var(--muted)',
                  background: active ? 'var(--panel-2)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'background .12s, color .12s',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--panel-2)'; e.currentTarget.style.color = 'var(--text)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' } }}
              >
                <span style={{ font: '500 13px var(--mono)', width: 18, textAlign: 'center', color: active ? 'var(--b2b)' : 'var(--dim)' }}>{icon}</span>
                {label}
              </a>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--line-soft)' }}>
          <div style={{ font: '500 11px/1.4 var(--mono)', color: 'var(--muted)', wordBreak: 'break-all', marginBottom: 10 }}>{email}</div>
          <button
            onClick={logout}
            style={{ font: '500 12px/1 var(--mono)', color: 'var(--alert)', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, padding: '32px 28px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
