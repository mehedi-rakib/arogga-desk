import type { Product } from '@/types/product'

export function analyse(p: Product) {
  const v = p.pv?.[0] ?? ({} as Product['pv'][0])
  const mrp = +v.pv_mrp || +v.pv_b2c_mrp || 0
  const b2b = +v.pv_b2b_discounted_price || +v.pv_b2b_price || 0
  const b2c = +v.pv_b2c_discounted_price || +v.pv_b2c_price || 0
  const cost = +v.pv_purchase_price || 0

  const profitB2b = b2b - cost
  const profitB2c = b2c - cost

  return {
    v,
    mrp,
    b2b,
    b2c,
    cost,
    profitB2b,
    profitB2c,
    mgB2b: b2b ? (profitB2b / b2b) * 100 : 0,
    mgB2c: b2c ? (profitB2c / b2c) * 100 : 0,
    mkB2b: cost ? (profitB2b / cost) * 100 : 0,
    mkB2c: cost ? (profitB2c / cost) * 100 : 0,
    spread: b2c - b2b,
    inStock: v.pv_stock_status === 1 && p.p_allow_sales === 1,
  }
}

export type Analysis = ReturnType<typeof analyse>

export function mgClass(m: number): 'good' | 'mid' | 'bad' {
  return m >= 20 ? 'good' : m >= 8 ? 'mid' : 'bad'
}

export function productImage(p: Product): string {
  if (p.POSTER) return p.POSTER
  const a = p.attachedFiles_p_images || []
  if (a.length) return a[0].src
  const b = p.pv?.[0]?.attachedFiles_pv_images || []
  return b.length ? b[0].src : ''
}

export function gallery(p: Product): string[] {
  const a = (p.attachedFiles_p_images || []).map((x) => x.src)
  const b = (p.pv?.[0]?.attachedFiles_pv_images || []).map((x) => x.src)
  return [...new Set([...a, ...b])]
}

export const bdt = (n: number | string): string =>
  '৳' + Number(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })

export const pct = (n: number | string): string =>
  (Number(n) || 0).toFixed(1) + '%'
