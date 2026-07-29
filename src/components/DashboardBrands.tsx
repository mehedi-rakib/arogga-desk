'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { bdt } from '@/lib/pricing'

interface Brand { name: string; count: number; avgB2b: number; totalOrders: number }

export default function DashboardBrands() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [filtered, setFiltered] = useState<Brand[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/brands')
      .then(r => r.json())
      .then(j => { setBrands(j.data ?? []); setFiltered(j.data ?? []) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(q ? brands.filter(b => b.name.toLowerCase().includes(q)) : brands)
  }, [search, brands])

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-.02em' }}>
        Brands
      </h1>
      <p style={{ font: '13px/1.5 var(--mono)', color: 'var(--muted)', margin: '0 0 18px' }}>
        <strong style={{ color: 'var(--text)' }}>{brands.length}</strong> brands · click any row to filter products
      </p>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Filter brands…"
        style={{ width: '100%', maxWidth: 360, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 14px', fontSize: 13.5, color: 'var(--text)', outline: 'none', marginBottom: 14 }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--b2b)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)' }}
      />

      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Brand', 'Products', 'Avg B2B Price', 'Total Orders'].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Products' || h === 'Total Orders' ? 'right' : 'left', font: '500 10px/1 var(--mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                  {[200, 60, 80, 80].map((w, j) => (
                    <td key={j} style={{ padding: '13px 16px' }}>
                      <div style={{ height: 14, width: w, borderRadius: 4, background: 'var(--line-soft)', animation: 'pulse 1.2s infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.map(b => (
              <tr
                key={b.name}
                onClick={() => router.push(`/dashboard/products?_brand=${encodeURIComponent(b.name)}`)}
                style={{ borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--panel-2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '' }}
              >
                <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text)' }}>{b.name}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', font: '600 13px/1 var(--mono)', color: 'var(--b2b)' }}>{b.count.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', font: '13px/1 var(--mono)', color: 'var(--text)' }}>{bdt(b.avgB2b)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', font: '13px/1 var(--mono)', color: 'var(--b2c)' }}>{(b.totalOrders || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div style={{ padding: '30px', textAlign: 'center', font: '13px var(--mono)', color: 'var(--muted)' }}>No brands found.</div>
        )}
      </div>
    </div>
  )
}
