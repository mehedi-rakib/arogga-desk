'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Product, SortMode } from '@/types/product'
import { analyse, mgClass, productImage, bdt, pct } from '@/lib/pricing'
import ProductCard from './ProductCard'
import ProductDetail from './ProductDetail'

interface BrandOption { name: string; count: number }
interface CatOption { catId: number; count: number; types: string[] }

function sortRows(rows: Product[], mode: SortMode): Product[] {
  const r = [...rows]
  const A = new Map(r.map((p) => [p, analyse(p)]))
  const sorters: Partial<Record<SortMode, (a: Product, b: Product) => number>> = {
    mgB2b: (a, b) => A.get(b)!.mgB2b - A.get(a)!.mgB2b,
    profit: (a, b) => A.get(b)!.profitB2b - A.get(a)!.profitB2b,
    priceAsc: (a, b) => A.get(a)!.b2b - A.get(b)!.b2b,
    priceDesc: (a, b) => A.get(b)!.b2b - A.get(a)!.b2b,
    orders: (a, b) => (b.productCountOrdered || 0) - (a.productCountOrdered || 0),
  }
  const fn = sorters[mode]
  return fn ? r.sort(fn) : r
}

export default function DashboardProducts() {
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('')
  const [cat, setCat] = useState('')
  const [rows, setRows] = useState<Product[]>([])
  const [sorted, setSorted] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [per, setPer] = useState(24)
  const [sortMode, setSortMode] = useState<SortMode>('rel')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [cats, setCats] = useState<CatOption[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Load brand + category options once
  useEffect(() => {
    fetch('/api/brands').then(r => r.json()).then(j => setBrands(j.data ?? []))
    fetch('/api/categories').then(r => r.json()).then(j => setCats(j.data ?? []))
  }, [])

  const doSearch = useCallback(async (q: string, pg: number, perPage: number, b: string, c: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ _page: String(pg), _perPage: String(perPage) })
      if (q.trim()) params.set('_search', q.trim())
      if (b) params.set('_brand', b)
      if (c) params.set('_cat', c)
      const res = await fetch(`/api/search?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setRows(json.data || [])
      setTotal(json.total || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { setSorted(sortRows(rows, sortMode)) }, [rows, sortMode])

  const run = (pg = 1) => {
    setPage(pg)
    doSearch(query, pg, per, brand, cat)
  }

  // Initial load
  useEffect(() => { doSearch('', 1, 24, '', '') }, [doSearch])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetail()
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const openDetail = (p: Product) => { setSelected(p); setDrawerOpen(true); document.body.style.overflow = 'hidden' }
  const closeDetail = () => { setDrawerOpen(false); document.body.style.overflow = '' }
  const pages = Math.max(1, Math.ceil(total / per))

  return (
    <>
      <div>
        <h1 style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontSize: 22, fontWeight: 700, margin: '0 0 20px', letterSpacing: '-.02em' }}>
          Products
        </h1>

        {/* Filters row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          {/* Search */}
          <div style={{ flex: '1 1 260px', position: 'relative', display: 'flex', alignItems: 'center', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: '5px 5px 5px 14px' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--b2b)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') run(1) }}
              placeholder="Search products…"
              autoComplete="off"
              style={{ flex: 1, background: 'none', border: 0, outline: 0, padding: '9px 10px', fontSize: 14, color: 'var(--text)' }}
            />
            <button onClick={() => run(1)} style={{ background: 'var(--b2b)', color: '#06251c', fontWeight: 600, padding: '9px 16px', borderRadius: 7, fontSize: 13 }}>
              Search
            </button>
          </div>

          {/* Brand filter */}
          <select
            value={brand}
            onChange={e => { setBrand(e.target.value); setPage(1); doSearch(query, 1, per, e.target.value, cat) }}
            style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', fontSize: 13, color: brand ? 'var(--text)' : 'var(--muted)', minWidth: 160 }}
          >
            <option value="">All Brands</option>
            {brands.map(b => <option key={b.name} value={b.name}>{b.name} ({b.count})</option>)}
          </select>

          {/* Category filter */}
          <select
            value={cat}
            onChange={e => { setCat(e.target.value); setPage(1); doSearch(query, 1, per, brand, e.target.value) }}
            style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', fontSize: 13, color: cat ? 'var(--text)' : 'var(--muted)', minWidth: 160 }}
          >
            <option value="">All Categories</option>
            {cats.map(c => <option key={c.catId} value={String(c.catId)}>Cat {c.catId} ({c.count})</option>)}
          </select>

          {/* Clear */}
          {(query || brand || cat) && (
            <button
              onClick={() => { setQuery(''); setBrand(''); setCat(''); doSearch('', 1, per, '', '') }}
              style={{ padding: '0 14px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, color: 'var(--muted)', background: 'var(--panel)' }}
            >
              Clear ×
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 0', borderTop: '1px solid var(--line-soft)', marginBottom: 16 }}>
          <div style={{ font: '500 12px/1 var(--mono)', color: 'var(--muted)' }}>
            {loading ? 'Loading…' : <><strong style={{ color: 'var(--text)' }}>{total.toLocaleString()}</strong> results</>}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ font: '500 11px/1 var(--mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>Sort</label>
            <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}
              style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--text)' }}>
              <option value="rel">Relevance</option>
              <option value="mgB2b">B2B margin ↓</option>
              <option value="profit">Profit/unit ↓</option>
              <option value="priceAsc">Price ↑</option>
              <option value="priceDesc">Price ↓</option>
              <option value="orders">Most ordered</option>
            </select>
            <select value={per} onChange={e => { setPer(+e.target.value); doSearch(query, 1, +e.target.value, brand, cat) }}
              style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--text)' }}>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--panel)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', height: 290, animation: 'pulse 1.2s infinite' }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--alert)' }}>{error}</div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', font: '14px var(--mono)' }}>No products found.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
            {sorted.map(p => <ProductCard key={p.p_id} product={p} onClick={() => openDetail(p)} />)}
          </div>
        )}

        {/* Pagination */}
        {sorted.length > 0 && !loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '24px 0 8px' }}>
            <button disabled={page <= 1} onClick={() => run(page - 1)}
              style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 14px', font: '500 13px var(--mono)', background: 'var(--panel)', opacity: page <= 1 ? 0.35 : 1 }}>
              ← Prev
            </button>
            <span style={{ font: '500 12px var(--mono)', color: 'var(--muted)' }}>Page {page} of {pages}</span>
            <button disabled={page >= pages} onClick={() => run(page + 1)}
              style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 14px', font: '500 13px var(--mono)', background: 'var(--panel)', opacity: page >= pages ? 0.35 : 1 }}>
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Scrim */}
      <div onClick={closeDetail} style={{ position: 'fixed', inset: 0, background: 'rgba(6,8,12,.7)', backdropFilter: 'blur(3px)', opacity: drawerOpen ? 1 : 0, pointerEvents: drawerOpen ? 'auto' : 'none', transition: 'opacity .2s', zIndex: 50 }} />

      {/* Drawer */}
      <aside style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: 'min(760px,100%)', zIndex: 60, background: 'var(--bg)', borderLeft: '1px solid var(--line)', transform: drawerOpen ? 'none' : 'translateX(102%)', transition: 'transform .26s cubic-bezier(.32,.72,0,1)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {selected && <ProductDetail product={selected} onClose={closeDetail} />}
      </aside>
    </>
  )
}
