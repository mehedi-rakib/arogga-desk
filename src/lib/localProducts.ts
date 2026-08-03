/**
 * Reads product data from local JSON chunk files (data/products/chunk-*.json).
 * Loaded once per process and cached — subsequent calls are instant.
 */

import fs from 'fs'
import path from 'path'
import type { Product } from '@/types/product'

const DATA_DIR = path.resolve(process.cwd(), 'data', 'products')

let _cache: Product[] | null = null

export function isLocalDataAvailable(): boolean {
  return fs.existsSync(DATA_DIR) && fs.readdirSync(DATA_DIR).some(f => f.endsWith('.json'))
}

export function loadAll(): Product[] {
  if (_cache) return _cache

  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('chunk-') && f.endsWith('.json'))
    .sort()

  const all: Product[] = []
  for (const f of files) {
    const products: Product[] = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')
    )
    all.push(...products)
  }

  _cache = all
  return all
}

export interface LocalSearchOptions {
  search?: string
  brand?: string
  cat?: string
  page?: number
  perPage?: number
}

export function searchLocal(opts: LocalSearchOptions) {
  const { search = '', brand = '', cat = '', page = 1, perPage = 24 } = opts

  let results = loadAll()

  // Filter
  if (search) {
    const q = search.toLowerCase()
    results = results.filter(p =>
      (p.p_name && p.p_name.toLowerCase().includes(q)) ||
      (p.p_generic_name && p.p_generic_name.toLowerCase().includes(q)) ||
      (p.p_brand_name && p.p_brand_name.toLowerCase().includes(q)) ||
      (p.p_name_bn && p.p_name_bn.toLowerCase().includes(q))
    )

    // Relevance sort: name matches first, then generic, then brand
    results.sort((a, b) => {
      const aName = a.p_name?.toLowerCase().includes(q) ? 2 : 0
      const bName = b.p_name?.toLowerCase().includes(q) ? 2 : 0
      const aGen = a.p_generic_name?.toLowerCase().includes(q) ? 1 : 0
      const bGen = b.p_generic_name?.toLowerCase().includes(q) ? 1 : 0
      return (bName + bGen) - (aName + aGen) || (b.p_trending_score || 0) - (a.p_trending_score || 0)
    })
  } else {
    // Default: sort by trending score
    results = results.slice().sort((a, b) => (b.p_trending_score || 0) - (a.p_trending_score || 0))
  }

  if (brand) {
    results = results.filter(p => p.p_brand_name?.toLowerCase().includes(brand.toLowerCase()))
  }

  if (cat) {
    const catId = parseInt(cat, 10)
    results = results.filter(p => p.p_cat_id === catId)
  }

  const total = results.length
  const skip = (page - 1) * perPage
  const data = results.slice(skip, skip + perPage)

  return { total, data, source: 'local' as const }
}

export function allBrands() {
  const all = loadAll()
  const map = new Map<string, { count: number; totalOrders: number; totalB2b: number; b2bCount: number }>()

  for (const p of all) {
    const name = p.p_brand_name
    if (!name) continue
    const b2b = p.pv?.[0]?.pv_b2b_discounted_price ?? p.pv?.[0]?.pv_b2b_price ?? 0
    const existing = map.get(name)
    if (existing) {
      existing.count++
      existing.totalOrders += p.productCountOrdered || 0
      if (b2b > 0) { existing.totalB2b += b2b; existing.b2bCount++ }
    } else {
      map.set(name, { count: 1, totalOrders: p.productCountOrdered || 0, totalB2b: b2b, b2bCount: b2b > 0 ? 1 : 0 })
    }
  }

  return Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      count: v.count,
      totalOrders: v.totalOrders,
      avgB2b: v.b2bCount > 0 ? Math.round((v.totalB2b / v.b2bCount) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export function allCategories() {
  const all = loadAll()
  const map = new Map<number, { count: number; types: Set<string>; totalOrders: number; totalB2b: number; b2bCount: number }>()

  for (const p of all) {
    const catId = p.p_cat_id
    if (!catId) continue
    const b2b = p.pv?.[0]?.pv_b2b_discounted_price ?? p.pv?.[0]?.pv_b2b_price ?? 0
    const existing = map.get(catId)
    if (existing) {
      existing.count++
      existing.totalOrders += p.productCountOrdered || 0
      if (p.p_type) existing.types.add(p.p_type)
      if (b2b > 0) { existing.totalB2b += b2b; existing.b2bCount++ }
    } else {
      map.set(catId, {
        count: 1,
        types: new Set(p.p_type ? [p.p_type] : []),
        totalOrders: p.productCountOrdered || 0,
        totalB2b: b2b,
        b2bCount: b2b > 0 ? 1 : 0,
      })
    }
  }

  return Array.from(map.entries())
    .map(([catId, v]) => ({
      catId,
      count: v.count,
      name: '',
      types: Array.from(v.types),
      totalOrders: v.totalOrders,
      avgB2b: v.b2bCount > 0 ? Math.round((v.totalB2b / v.b2bCount) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export function getStats() {
  const all = loadAll()
  const brands = new Set(all.map(p => p.p_brand_name).filter(Boolean))
  const cats = new Set(all.map(p => p.p_cat_id).filter(Boolean))
  const topOrdered = all
    .slice()
    .sort((a, b) => (b.productCountOrdered || 0) - (a.productCountOrdered || 0))
    .slice(0, 5)

  return {
    totalProducts: all.length,
    totalBrands: brands.size,
    totalCategories: cats.size,
    topOrdered,
  }
}
