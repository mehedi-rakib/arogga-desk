'use client'

import { useEffect, useState } from 'react'
import { Product } from '@/types/product'
import { analyse, bdt, pct, mgClass, productImage } from '@/lib/pricing'

export default function DashboardOrders() {
  const [rows, setRows] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const per = 50

  const load = async (pg: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/search?_page=${pg}&_perPage=${per}&_sort=orders`)
      const json = await res.json()
      const sorted = [...(json.data || [])].sort(
        (a: Product, b: Product) => (b.productCountOrdered || 0) - (a.productCountOrdered || 0)
      )
      setRows(sorted)
      setTotal(json.total || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [])

  const pages = Math.max(1, Math.ceil(total / per))

  const mgColors: Record<string, string> = {
    good: 'var(--b2b)',
    mid: 'var(--b2c)',
    bad: 'var(--alert)',
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-.02em' }}>
        Orders
      </h1>
      <p style={{ font: '13px/1.5 var(--mono)', color: 'var(--muted)', margin: '0 0 22px' }}>
        Products ranked by <strong style={{ color: 'var(--text)' }}>total orders</strong> — {total.toLocaleString()} total
      </p>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['#', 'Product', 'Brand', 'Form', 'B2B Price', 'MRP', 'B2B Margin', 'Orders', 'Views'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: h === '#' || h === 'Orders' || h === 'Views' ? 'center' : 'left', font: '500 10px/1 var(--mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} style={{ padding: '12px 14px' }}>
                      <div style={{ height: 14, borderRadius: 4, background: 'var(--line-soft)', animation: 'pulse 1.2s infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.map((p, i) => {
              const a = analyse(p)
              const mc = mgClass(a.mgB2b)
              const rank = (page - 1) * per + i + 1
              return (
                <tr key={p.p_id ?? i} style={{ borderBottom: '1px solid var(--line-soft)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--panel-2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '' }}
                >
                  <td style={{ padding: '10px 14px', textAlign: 'center', font: '500 12px/1 var(--mono)', color: 'var(--dim)' }}>
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                  </td>
                  <td style={{ padding: '10px 14px', maxWidth: 220 }}>
                    <div style={{ fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.p_name}</div>
                    {p.p_generic_name && <div style={{ font: '11px/1.3 var(--mono)', color: 'var(--dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.p_generic_name}</div>}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.p_brand_name || '—'}</td>
                  <td style={{ padding: '10px 14px', font: '12px var(--mono)', color: 'var(--dim)' }}>{a.v?.pu_base_unit_label || '—'}</td>
                  <td style={{ padding: '10px 14px', font: '600 13px/1 var(--mono)', color: 'var(--b2b)', whiteSpace: 'nowrap' }}>{bdt(a.b2b)}</td>
                  <td style={{ padding: '10px 14px', font: '12px/1 var(--mono)', color: 'var(--dim)', whiteSpace: 'nowrap', textDecoration: a.mrp > a.b2b ? 'line-through' : undefined }}>{bdt(a.mrp)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{ font: '600 11px/1 var(--mono)', padding: '4px 8px', borderRadius: 5, color: mgColors[mc], background: `${mgColors[mc]}1a` }}>
                      {pct(a.mgB2b)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', font: '700 13px/1 var(--mono)', color: 'var(--b2c)' }}>{(p.productCountOrdered || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', font: '12px/1 var(--mono)', color: 'var(--dim)' }}>{(p.productCountViewed || 0).toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 20 }}>
          <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p) }}
            style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 14px', font: '500 13px var(--mono)', background: 'var(--panel)', opacity: page <= 1 ? 0.35 : 1 }}>
            ← Prev
          </button>
          <span style={{ font: '500 12px var(--mono)', color: 'var(--muted)' }}>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => { const p = page + 1; setPage(p); load(p) }}
            style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 14px', font: '500 13px var(--mono)', background: 'var(--panel)', opacity: page >= pages ? 0.35 : 1 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
