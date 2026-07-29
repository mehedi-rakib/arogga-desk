'use client'

import { Product } from '@/types/product'
import { analyse, mgClass, productImage, bdt, pct } from '@/lib/pricing'

interface Props {
  product: Product
  onClick: () => void
}

export default function ProductCard({ product: p, onClick }: Props) {
  const a = analyse(p)
  const img = productImage(p)
  const off = a.v.pv_b2b_discount_percent || 0
  const unit = a.v.pu_b2b_sales_unit_label || a.v.pu_base_unit_label || '—'
  const costW = a.mrp ? Math.min(100, (a.cost / a.mrp) * 100) : 0
  const b2bW = a.mrp ? Math.max(0, Math.min(100, (a.b2b / a.mrp) * 100) - costW) : 0
  const mc = mgClass(a.mgB2b)

  const mgColors: Record<string, { bg: string; color: string }> = {
    good: { bg: 'rgba(53,208,165,.13)', color: 'var(--b2b)' },
    mid: { bg: 'rgba(242,166,59,.13)', color: 'var(--b2c)' },
    bad: { bg: 'rgba(255,107,107,.13)', color: 'var(--alert)' },
  }

  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--line-soft)',
        borderRadius: 'var(--r)',
        overflow: 'hidden',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        width: '100%',
        transition: 'transform .16s ease, border-color .16s, box-shadow .16s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-3px)'
        el.style.borderColor = 'var(--line)'
        el.style.boxShadow = '0 12px 28px -14px #000'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.transform = ''
        el.style.borderColor = 'var(--line-soft)'
        el.style.boxShadow = ''
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', aspectRatio: '1', background: '#fff', display: 'grid', placeItems: 'center', padding: '12px' }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            loading="lazy"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }}
            onError={(e) => {
              const el = e.currentTarget
              const div = document.createElement('div')
              div.style.cssText = 'font:500 11px var(--mono);color:#b9bcc4'
              div.textContent = 'no image'
              el.replaceWith(div)
            }}
          />
        ) : (
          <div style={{ font: '500 11px var(--mono)', color: '#b9bcc4' }}>no image</div>
        )}
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
          {p.p_is_flash_sale ? (
            <span style={{ font: '600 9.5px/1 var(--mono)', letterSpacing: '.09em', textTransform: 'uppercase', padding: '4px 7px', borderRadius: 5, background: 'var(--b2c)', color: '#2a1a02' }}>
              flash sale
            </span>
          ) : null}
          {!a.inStock ? (
            <span style={{ font: '600 9.5px/1 var(--mono)', letterSpacing: '.09em', textTransform: 'uppercase', padding: '4px 7px', borderRadius: 5, background: 'var(--alert)', color: '#2b0707' }}>
              out of stock
            </span>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '13px 14px 14px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
        <div style={{ font: '500 10px/1 var(--mono)', letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--dim)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span>{p.p_brand_name || p.p_type || '—'}</span>
          <span>{unit}</span>
        </div>

        <div style={{ fontSize: 13.5, lineHeight: 1.4, fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 38 }}>
          {p.p_name}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 21, color: 'var(--b2b)', letterSpacing: '-.02em' }}>
            {bdt(a.b2b)}
          </span>
          {a.mrp > a.b2b && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)', textDecoration: 'line-through' }}>
              {bdt(a.mrp)}
            </span>
          )}
          {off > 0 && (
            <span style={{ font: '600 10px/1 var(--mono)', color: 'var(--b2c)', border: '1px solid rgba(242,166,59,.35)', borderRadius: 4, padding: '3px 5px' }}>
              −{off}%
            </span>
          )}
        </div>

        {/* Mini bar */}
        <div title="cost / b2b margin / headroom to MRP" style={{ height: 5, borderRadius: 3, overflow: 'hidden', display: 'flex', background: 'var(--line-soft)' }}>
          <span style={{ display: 'block', height: '100%', width: `${costW}%`, background: 'var(--cost)' }} />
          <span style={{ display: 'block', height: '100%', width: `${b2bW}%`, background: 'var(--b2b)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', font: '500 11px/1 var(--mono)', color: 'var(--dim)', paddingTop: 2 }}>
          <span style={{ padding: '4px 7px', borderRadius: 5, fontWeight: 600, ...mgColors[mc] }}>
            {pct(a.mgB2b)} B2B
          </span>
          <span>{bdt(a.profitB2b)}/unit · {(p.productCountOrdered || 0).toLocaleString()} sold</span>
        </div>
      </div>
    </button>
  )
}
