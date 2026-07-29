'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { bdt } from '@/lib/pricing'

interface Category { catId: number; count: number; types: string[]; totalOrders: number; avgB2b: number }

export default function DashboardCategories() {
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(j => setCats(j.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-.02em' }}>
        Categories
      </h1>
      <p style={{ font: '13px/1.5 var(--mono)', color: 'var(--muted)', margin: '0 0 18px' }}>
        <strong style={{ color: 'var(--text)' }}>{cats.length}</strong> categories · click any row to filter products
      </p>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Category ID', 'Type(s)', 'Products', 'Avg B2B Price', 'Total Orders'].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Products' || h === 'Total Orders' ? 'right' : 'left', font: '500 10px/1 var(--mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 15 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                  {[80, 120, 60, 80, 80].map((w, j) => (
                    <td key={j} style={{ padding: '13px 16px' }}>
                      <div style={{ height: 14, width: w, borderRadius: 4, background: 'var(--line-soft)', animation: 'pulse 1.2s infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : cats.map(c => (
              <tr
                key={c.catId}
                onClick={() => router.push(`/dashboard/products?_cat=${c.catId}`)}
                style={{ borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--panel-2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '' }}
              >
                <td style={{ padding: '12px 16px', font: '600 13px/1 var(--mono)', color: 'var(--b2b)' }}>{c.catId}</td>
                <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12 }}>
                  {(c.types || []).filter(Boolean).join(', ') || '—'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', font: '600 13px/1 var(--mono)', color: 'var(--text)' }}>{c.count.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', font: '13px/1 var(--mono)', color: 'var(--text)' }}>{bdt(c.avgB2b)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', font: '13px/1 var(--mono)', color: 'var(--b2c)' }}>{(c.totalOrders || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
