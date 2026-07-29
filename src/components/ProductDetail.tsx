'use client'

import { Product } from '@/types/product'
import { analyse, gallery, bdt, pct } from '@/lib/pricing'

interface Props {
  product: Product
  onClose: () => void
}

const tile = (label: string, value: string, sub?: string, highlight?: boolean) => (
  <div
    key={label}
    style={{
      background: highlight ? 'linear-gradient(180deg,rgba(53,208,165,.07),var(--panel))' : 'var(--panel)',
      border: highlight ? '1px solid rgba(53,208,165,.3)' : '1px solid var(--line-soft)',
      borderRadius: 10,
      padding: 14,
    }}
  >
    <div style={{ font: '500 9.5px/1 var(--mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--dim)' }}>{label}</div>
    <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 20, marginTop: 9, letterSpacing: '-.02em', color: highlight ? 'var(--b2b)' : undefined }}>{value}</div>
    {sub && <div style={{ font: '500 11px var(--mono)', color: 'var(--dim)', marginTop: 5 }}>{sub}</div>}
  </div>
)

export default function ProductDetail({ product: p, onClose }: Props) {
  const a = analyse(p)
  const v = a.v
  const pics = gallery(p)
  const tags = (p.p_product_tags || []).slice(0, 14)

  const lowKey = a.b2b <= a.b2c ? 'B2B' : 'B2C'
  const lo = Math.min(a.b2b, a.b2c)
  const hi = Math.max(a.b2b, a.b2c)
  const top = Math.max(a.mrp, hi, 1)
  const w = (n: number) => Math.max(0, (n / top) * 100)

  const segs = [
    { cls: 'cost', w: w(a.cost), label: `Cost ${bdt(a.cost)}`, bg: 'var(--cost)', color: '#0d0722' },
    { cls: 'a', w: w(lo - a.cost), label: `${lowKey} margin ${bdt(lo - a.cost)}`, bg: 'rgba(53,208,165,.85)', color: '#052a20' },
    { cls: 'b', w: w(hi - lo), label: `Spread ${bdt(hi - lo)}`, bg: 'rgba(242,166,59,.8)', color: '#2a1a02' },
    { cls: 'head', w: w(top - hi), label: `MRP headroom ${bdt(top - hi)}`, bg: 'repeating-linear-gradient(115deg,#2a3044,#2a3044 6px,#232838 6px,#232838 12px)', color: 'var(--muted)' },
  ].filter((s) => s.w > 0.4)

  const conv = p.productCountViewed ? (p.productCountOrdered / p.productCountViewed) * 100 : 0

  return (
    <>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0,
        background: 'linear-gradient(180deg,#161a24 70%,rgba(22,26,36,0))',
        padding: '18px 24px 22px', zIndex: 2,
        display: 'flex', gap: 16, alignItems: 'flex-start',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', font: '500 10.5px/1 var(--mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>
            <span>{p.p_brand_name || '—'}</span>
            <span>pv {v.pv_id ?? '—'}</span>
            {v.pv_sku && <span>{v.pv_sku}</span>}
            <span style={{ color: a.inStock ? 'var(--b2b)' : undefined, fontWeight: a.inStock ? 600 : undefined }}>
              {a.inStock ? 'in stock' : 'out of stock'}
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontSize: 19, lineHeight: 1.32, margin: '6px 0 8px', letterSpacing: '-.01em', color: 'var(--text)' }}>
            {p.p_name}
          </h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', font: '500 10.5px/1 var(--mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>
            <span>★ {v.pv_average_rating ?? '—'} ({v.pv_total_rating ?? 0})</span>
            <span>unit {v.pu_base_unit_label || '—'}</span>
            <span>cat {p.p_cat_id ?? '—'}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            flexShrink: 0, width: 34, height: 34,
            border: '1px solid var(--line)', borderRadius: 8,
            display: 'grid', placeItems: 'center',
            background: 'var(--panel)', fontSize: 16, color: 'var(--muted)',
          }}
          aria-label="Close"
          autoFocus
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '0 24px 60px', display: 'flex', flexDirection: 'column', gap: 26 }}>

        {/* Price ladder */}
        <section>
          <h4 style={{ font: '600 10.5px/1 var(--mono)', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)', margin: '0 0 14px', paddingBottom: 9, borderBottom: '1px solid var(--line-soft)' }}>
            Price ladder — cost to MRP
          </h4>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line-soft)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', height: 46, borderRadius: 8, overflow: 'hidden', background: 'var(--line-soft)' }}>
              {segs.map((s) => (
                <div
                  key={s.cls}
                  title={s.label}
                  style={{
                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    font: '600 11px var(--mono)', minWidth: 0,
                    width: `${s.w}%`, background: s.bg, color: s.color,
                    overflow: 'hidden',
                  }}
                >
                  <span style={{ padding: '0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', font: '500 10px var(--mono)', color: 'var(--dim)', marginTop: 8 }}>
              <span>৳0</span><span>{bdt(top)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginTop: 18 }}>
              {[
                { color: 'var(--cost)', label: 'Purchase', value: bdt(a.cost), sub: 'what it costs', vc: undefined },
                { color: 'var(--b2b)', label: 'B2B price', value: bdt(a.b2b), sub: `−${v.pv_b2b_discount_percent || 0}% off MRP`, vc: 'var(--b2b)' },
                { color: 'var(--b2c)', label: 'B2C price', value: bdt(a.b2c), sub: `−${v.pv_b2c_discount_percent || 0}% off MRP`, vc: 'var(--b2c)' },
                { color: 'var(--mrp)', label: 'MRP', value: bdt(a.mrp), sub: 'list ceiling', vc: 'var(--muted)' },
              ].map((leg) => (
                <div key={leg.label} style={{ borderLeft: `3px solid ${leg.color}`, paddingLeft: 11 }}>
                  <div style={{ font: '500 9.5px/1 var(--mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6 }}>{leg.label}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 18, letterSpacing: '-.02em', color: leg.vc }}>{leg.value}</div>
                  <div style={{ font: '500 10.5px var(--mono)', color: 'var(--dim)', marginTop: 3 }}>{leg.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Margin analysis */}
        <section>
          <h4 style={{ font: '600 10.5px/1 var(--mono)', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)', margin: '0 0 14px', paddingBottom: 9, borderBottom: '1px solid var(--line-soft)' }}>
            Margin analysis
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))', gap: 12 }}>
            {tile('B2B margin', pct(a.mgB2b), `${bdt(a.profitB2b)} per unit`, true)}
            {tile('B2B markup', pct(a.mkB2b), 'over cost')}
            {tile('B2C margin', pct(a.mgB2c), `${bdt(a.profitB2c)} per unit`)}
            {tile('B2B → B2C spread', bdt(a.spread), 'resale room')}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, marginTop: 16 }}>
            <tbody>
              {[
                {
                  k: 'Profit: buy B2B → resell B2C',
                  v: `${bdt(a.spread)} (${pct(a.b2b ? (a.spread / a.b2b) * 100 : 0)})`,
                  vc: 'var(--b2b)',
                },
                {
                  k: 'Profit: resell at MRP',
                  v: `${bdt(a.mrp - a.b2b)} (${pct(a.b2b ? ((a.mrp - a.b2b) / a.b2b) * 100 : 0)})`,
                  vc: undefined,
                },
                {
                  k: `Full-case value at max B2B qty (${v.pv_b2b_max_qty ?? '—'})`,
                  v: bdt(a.b2b * (v.pv_b2b_max_qty || 0)),
                  vc: undefined,
                },
                {
                  k: 'Profit on that case',
                  v: bdt(a.profitB2b * (v.pv_b2b_max_qty || 0)),
                  vc: undefined,
                },
                {
                  k: 'pv_m_percentage from API',
                  v: pct(v.pv_m_percentage),
                  vc: undefined,
                },
              ].map((row) => (
                <tr key={row.k}>
                  <td style={{ padding: '11px 0', borderBottom: '1px solid var(--line-soft)', color: 'var(--muted)' }}>{row.k}</td>
                  <td style={{ padding: '11px 0', borderBottom: '1px solid var(--line-soft)', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 500, color: row.vc }}>{row.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)', background: 'rgba(242,166,59,.07)', border: '1px solid rgba(242,166,59,.22)', borderRadius: 9, padding: '12px 14px', marginTop: 14 }}>
            The API&apos;s <strong style={{ color: 'var(--b2c)' }}>pv_m_percentage</strong> is the <strong style={{ color: 'var(--b2c)' }}>B2C</strong> margin — (b2c price − purchase) ÷ b2c price. It says nothing about your B2B economics. On this item the real B2B margin is <strong style={{ color: 'var(--b2c)' }}>{pct(a.mgB2b)}</strong> against the API&apos;s {pct(v.pv_m_percentage)}.
          </div>
        </section>

        {/* Order limits */}
        <section>
          <h4 style={{ font: '600 10.5px/1 var(--mono)', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)', margin: '0 0 14px', paddingBottom: 9, borderBottom: '1px solid var(--line-soft)' }}>
            Order limits &amp; units
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <tbody>
              {[
                { k: 'B2B quantity', v: `${v.pv_b2b_min_qty ?? '—'} – ${v.pv_b2b_max_qty ?? '—'} ${v.pu_b2b_sales_unit_label || ''}` },
                { k: 'B2C quantity', v: `${v.pv_b2c_min_qty ?? '—'} – ${v.pv_b2c_max_qty ?? '—'} ${v.pu_b2c_sales_unit_label || ''}` },
                { k: 'Base unit', v: `${v.pu_base_unit_label || '—'} × ${v.pu_base_unit_multiplier ?? 1}` },
                { k: 'Sales allowed', v: `${p.p_allow_sales ? 'yes' : 'no'} · purchase ${v.pv_allow_purchase ? 'yes' : 'no'}` },
                { k: 'Delivery', v: `${p.p_is_not_allowed_outside_dhaka ? 'Dhaka only' : 'nationwide'}${p.p_cold ? ' · cold chain' : ''}` },
              ].map((row, i, arr) => (
                <tr key={row.k}>
                  <td style={{ padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line-soft)' : undefined, color: 'var(--muted)' }}>{row.k}</td>
                  <td style={{ padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line-soft)' : undefined, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 500 }}>{row.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Demand signal */}
        <section>
          <h4 style={{ font: '600 10.5px/1 var(--mono)', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)', margin: '0 0 14px', paddingBottom: 9, borderBottom: '1px solid var(--line-soft)' }}>
            Demand signal
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))', gap: 12 }}>
            {tile('Viewed', (p.productCountViewed || 0).toLocaleString())}
            {tile('Ordered', (p.productCountOrdered || 0).toLocaleString())}
            {tile('View → order', pct(conv))}
            {tile('Wishlisted', (p.productCountWishlist || 0).toLocaleString(), `trend ${v.pv_trending_score ?? '—'}`)}
          </div>
        </section>

        {/* Gallery */}
        {pics.length > 0 && (
          <section>
            <h4 style={{ font: '600 10.5px/1 var(--mono)', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)', margin: '0 0 14px', paddingBottom: 9, borderBottom: '1px solid var(--line-soft)' }}>
              Images ({pics.length})
            </h4>
            <div style={{ display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 6 }}>
              {pics.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  loading="lazy"
                  onClick={() => window.open(src, '_blank')}
                  style={{ width: 82, height: 82, flexShrink: 0, objectFit: 'contain', background: '#fff', borderRadius: 8, padding: 6, cursor: 'zoom-in' }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Description */}
        {p.p_short_description && (
          <section>
            <h4 style={{ font: '600 10.5px/1 var(--mono)', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)', margin: '0 0 14px', paddingBottom: 9, borderBottom: '1px solid var(--line-soft)' }}>
              Description
            </h4>
            <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--muted)', whiteSpace: 'pre-line' }}>{p.p_short_description}</div>
          </section>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <section>
            <h4 style={{ font: '600 10.5px/1 var(--mono)', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)', margin: '0 0 14px', paddingBottom: 9, borderBottom: '1px solid var(--line-soft)' }}>
              Campaign tags
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map((t) => (
                <span key={t} style={{ font: '500 10.5px var(--mono)', color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: 5, padding: '4px 8px' }}>{t}</span>
              ))}
            </div>
          </section>
        )}

        {/* Raw record */}
        <section>
          <details>
            <summary style={{ cursor: 'pointer', font: '600 10.5px var(--mono)', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)', padding: '12px 0' }}>
              Raw record ▾
            </summary>
            <pre style={{ background: '#0c0e14', border: '1px solid var(--line-soft)', borderRadius: 9, padding: 14, overflow: 'auto', maxHeight: 340, fontFamily: 'var(--mono)', fontSize: 11.5, lineHeight: 1.6, color: '#9fb3c8' }}>
              {JSON.stringify(p, null, 2)}
            </pre>
          </details>
        </section>
      </div>
    </>
  )
}
