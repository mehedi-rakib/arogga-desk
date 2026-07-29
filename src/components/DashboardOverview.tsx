'use client'

import { useEffect, useState } from 'react'
import { bdt } from '@/lib/pricing'
import type { Product } from '@/types/product'

interface Stats {
  totalProducts: number
  totalBrands: number
  totalCategories: number
  topOrdered: Product[]
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '20px 22px' }}>
      <div style={{ font: '500 11px/1 var(--mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontSize: 32, fontWeight: 700, color: color ?? 'var(--text)', letterSpacing: '-.02em' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  )
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(e => setError(e.message))
  }, [])

  if (error) return <p style={{ color: 'var(--alert)' }}>{error}</p>

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontSize: 22, fontWeight: 700, margin: '0 0 24px', letterSpacing: '-.02em' }}>
        Overview
      </h1>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 36 }}>
        {stats ? (
          <>
            <StatCard label="Total Products" value={stats.totalProducts} color="var(--b2b)" />
            <StatCard label="Brands" value={stats.totalBrands} />
            <StatCard label="Categories" value={stats.totalCategories} />
          </>
        ) : (
          [1, 2, 3].map(i => (
            <div key={i} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, height: 90, animation: 'pulse 1.2s infinite' }} />
          ))
        )}
      </div>

      {/* Top ordered */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontSize: 16, fontWeight: 600, margin: '0 0 14px', color: 'var(--text)' }}>
          Top 5 Most Ordered
        </h2>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Product', 'Brand', 'B2B Price', 'Orders', 'Views'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', font: '500 10.5px/1 var(--mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats?.topOrdered.map((p, i) => {
                const v = p.pv?.[0]
                const price = v?.pv_b2b_discounted_price || v?.pv_b2b_price || 0
                return (
                  <tr key={p.p_id ?? i} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text)' }}>{p.p_name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12 }}>{p.p_brand_name || '—'}</td>
                    <td style={{ padding: '12px 16px', font: '600 13px/1 var(--mono)', color: 'var(--b2b)' }}>{bdt(price)}</td>
                    <td style={{ padding: '12px 16px', font: '600 13px/1 var(--mono)', color: 'var(--b2c)' }}>{(p.productCountOrdered || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', font: '13px/1 var(--mono)', color: 'var(--dim)' }}>{(p.productCountViewed || 0).toLocaleString()}</td>
                  </tr>
                )
              }) ?? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--dim)', font: '13px var(--mono)' }}>Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
