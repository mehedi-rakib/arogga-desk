'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Product, SortMode } from '@/types/product'
import { analyse, mgClass, productImage, bdt, pct } from '@/lib/pricing'
import { exportAllProductsToXLSX } from '@/lib/export-advanced'
import { fetchWithCache } from '@/lib/cache'
import ProductCard from './ProductCard'
import ProductDetail from './ProductDetail'
import SearchableSelect, { SelectOption } from './SearchableSelect'
import SkeletonCard from './SkeletonCard'

interface BrandOption { name: string; count: number }

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
  const [type, setType] = useState('')
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
  const [types, setTypes] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  // Load brand options with cache
  useEffect(() => {
    fetchWithCache<{ data: BrandOption[] }>('/api/brands', 'brands')
      .then(j => setBrands(j.data ?? []))
      .catch(() => {
        fetch('/api/brands').then(r => r.json()).then(j => setBrands(j.data ?? []))
      })
  }, [])

  // Load product types
  useEffect(() => {
    fetchWithCache<{ data: string[] }>('/api/types', 'types')
      .then(j => setTypes(j.data ?? []))
      .catch(() => {
        fetch('/api/types').then(r => r.json()).then(j => setTypes(j.data ?? []))
      })
  }, [])

  const doSearch = useCallback(async (q: string, pg: number, perPage: number, b: string, t: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ _page: String(pg), _perPage: String(perPage) })
      if (q.trim()) params.set('_search', q.trim())
      if (b) params.set('_brand', b)
      if (t) params.set('_type', t)
      const cacheKey = `search:${params.toString()}`
      const json = await fetchWithCache<{ data: Product[]; total: number }>(`/api/search?${params}`, cacheKey)
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
    doSearch(query, pg, per, brand, type)
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

  // Build option lists for SearchableSelect (memoized)
  const brandOptions: SelectOption[] = useMemo(() =>
    brands.map(b => ({
      value: b.name,
      label: b.name,
      count: b.count,
    })), [brands])

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    setExportProgress({ current: 0, total: 0 })
    try {
      await exportAllProductsToXLSX(
        {
          query: query || undefined,
          brand: brand || undefined,
        },
        (current, total) => {
          setExportProgress({ current, total })
        }
      )
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      console.error('Export failed:', errorMsg, e)
      alert(`Export failed: ${errorMsg}`)
    } finally {
      setIsExporting(false)
      setExportProgress({ current: 0, total: 0 })
    }
  }, [query, brand])

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
          <SearchableSelect
            options={brandOptions}
            value={brand}
            onChange={val => { setBrand(val); setPage(1); doSearch(query, 1, per, val, type) }}
            placeholder="All Brands"
            searchPlaceholder="Search brands…"
          />

          {/* Type filter */}
          <select
            value={type}
            onChange={e => { setType(e.target.value); setPage(1); doSearch(query, 1, per, brand, e.target.value) }}
            style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', fontSize: 13, color: 'var(--text)' }}
          >
            <option value="">All Types</option>
            {types.map(t => (
              <option key={t} value={t}>{t || 'Unknown'}</option>
            ))}
          </select>

          {/* Clear */}
          {(query || brand || type) && (
            <button
              onClick={() => { setQuery(''); setBrand(''); setType(''); doSearch('', 1, per, '', '') }}
              style={{ padding: '0 14px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, color: 'var(--muted)', background: 'var(--panel)' }}
            >
              Clear ×
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 0', borderTop: '1px solid var(--line-soft)', marginBottom: 16, animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ font: '500 12px/1 var(--mono)', color: 'var(--muted)', minHeight: 16 }}>
            {loading ? (
              <div style={{ display: 'inline-block', background: 'var(--line-soft)', height: 14, width: 100, borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
            ) : (
              <><strong style={{ color: 'var(--text)' }}>{total.toLocaleString()}</strong> results</>
            )}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {sorted.length > 0 && (
              <button
                onClick={handleExport}
                disabled={loading || isExporting}
                title={isExporting ? `Exporting... ${exportProgress.current}/${exportProgress.total}` : `Export all filtered products to XLSX`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isExporting ? 'var(--dim)' : 'var(--b2b)',
                  color: '#06251c',
                  border: 'none',
                  borderRadius: 8,
                  padding: '7px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading || isExporting ? 'not-allowed' : 'pointer',
                  opacity: loading || isExporting ? 0.6 : 1,
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isExporting && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    background: 'rgba(0,0,0,0.1)',
                    width: `${exportProgress.total > 0 ? (exportProgress.current / exportProgress.total) * 100 : 0}%`,
                    transition: 'width 0.3s',
                  }} />
                )}
                <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isExporting ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      {exportProgress.total > 0 ? `${exportProgress.current}/${exportProgress.total}` : 'Exporting...'}
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Export All
                    </>
                  )}
                </span>
              </button>
            )}
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
            <select value={per} onChange={e => { setPer(+e.target.value); doSearch(query, 1, +e.target.value, brand, type) }}
              style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--text)' }}>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {error ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--alert)', animation: 'fadeIn 0.3s ease-out' }}>{error}</div>
        ) : sorted.length === 0 && !loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', font: '14px var(--mono)', animation: 'fadeIn 0.3s ease-out' }}>No products found.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14, animation: 'fadeIn 0.3s ease-out' }}>
            {loading ? (
              Array.from({ length: per }).map((_, i) => <SkeletonCard key={`skeleton-${i}`} />)
            ) : (
              sorted.map(p => <ProductCard key={p.p_id} product={p} onClick={() => openDetail(p)} />)
            )}
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
