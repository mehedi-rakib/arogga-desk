'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Product, SearchResponse, SortMode } from '@/types/product'
import { analyse } from '@/lib/pricing'
import ProductCard from './ProductCard'
import ProductDetail from './ProductDetail'

const SUGGESTIONS = ['simple', 'cetaphil', 'napa', 'vitamin c serum', 'sunscreen', 'dettol']

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

type ConnStatus = 'idle' | 'loading' | 'ok' | 'error'

export default function PriceDesk() {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<Product[]>([])
  const [sorted, setSorted] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [per, setPer] = useState(24)
  const [sortMode, setSortMode] = useState<SortMode>('rel')
  const [status, setStatus] = useState<ConnStatus>('idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async (q: string, pg: number, perPage: number) => {
    if (!q.trim()) { inputRef.current?.focus(); return }
    setLoading(true)
    setError('')
    setStatus('loading')

    try {
      const res = await fetch(`/api/search?_page=${pg}&_perPage=${perPage}&_search=${encodeURIComponent(q)}`)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text}`)
      }
      const json: SearchResponse = await res.json()
      setRows(json.data || [])
      setTotal(json.total || (json.data || []).length)
      setStatus('ok')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : String(e))
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const sorted = sortRows(rows, sortMode)
    setSorted(sorted)
  }, [rows, sortMode])

  const run = (pg = 1) => {
    setPage(pg)
    doSearch(query, pg, per)
    if (pg === 1) {
      history.replaceState(null, '', '#' + encodeURIComponent(query))
    }
  }

  useEffect(() => {
    const seed = decodeURIComponent(location.hash.slice(1)) || 'simple'
    setQuery(seed)
    doSearch(seed, 1, 24)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const openDetail = (p: Product) => {
    setSelected(p)
    setDrawerOpen(true)
    document.body.style.overflow = 'hidden'
  }

  const closeDetail = () => {
    setDrawerOpen(false)
    document.body.style.overflow = ''
  }

  const pages = Math.max(1, Math.ceil(total / per))

  const connDot = { idle: '#5f677c', loading: '#f2a63b', ok: '#35d0a5', error: '#ff6b6b' }[status]
  const connText = { idle: 'idle', loading: 'live request…', ok: 'connected · proxy', error: 'blocked' }[status]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--line-soft)',
        background: 'linear-gradient(180deg,#161a24,#12141c)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 22px', display: 'flex', alignItems: 'center', gap: 18, paddingTop: 14, paddingBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontWeight: 700, letterSpacing: '-.02em', fontSize: 18, whiteSpace: 'nowrap' }}>
            price<span style={{ color: 'var(--b2b)' }}>·</span>desk
            <small style={{ display: 'block', font: '400 10px/1 var(--mono)', letterSpacing: '.16em', color: 'var(--dim)', textTransform: 'uppercase', marginTop: 3 }}>arogga catalog</small>
          </div>
          <div style={{ marginLeft: 'auto', font: '500 11px/1 var(--mono)', color: 'var(--dim)', display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
              background: connDot,
              boxShadow: status === 'ok' ? '0 0 0 3px rgba(53,208,165,.15)' : undefined,
            }} />
            {connText}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 22px' }}>
        {/* Search hero */}
        <div style={{ padding: '34px 0 20px' }}>
          <div style={{
            position: 'relative', display: 'flex', alignItems: 'center',
            background: 'var(--panel)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '6px 6px 6px 18px',
            transition: 'border-color .15s, box-shadow .15s',
          }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--b2b)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(53,208,165,.09)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = '' }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') run(1) }}
              placeholder="Search the catalog — try simple, napa, cetaphil, vitamin c…"
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: 1, background: 'none', border: 0, outline: 0,
                padding: '14px 14px', fontSize: 17,
                fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)',
                letterSpacing: '-.01em', color: 'var(--text)',
              }}
            />
            <button
              onClick={() => run(1)}
              style={{ background: 'var(--b2b)', color: '#06251c', fontWeight: 600, padding: '12px 22px', borderRadius: 9, fontSize: 14 }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = '' }}
            >
              Search
            </button>
          </div>

          {/* Suggestion chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); doSearch(s, 1, per).then(() => { setPage(1) }); history.replaceState(null, '', '#' + encodeURIComponent(s)) }}
                style={{ border: '1px solid var(--line)', borderRadius: 99, padding: '6px 13px', fontSize: 12.5, color: 'var(--muted)', background: 'var(--panel)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--b2b)'; e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--muted)' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '16px 0', borderTop: '1px solid var(--line-soft)', marginTop: 22 }}>
          <div style={{ font: '500 12px/1 var(--mono)', color: 'var(--muted)', letterSpacing: '.04em' }}>
            {loading ? (
              'Searching…'
            ) : rows.length > 0 ? (
              <><strong style={{ color: 'var(--text)' }}>{total.toLocaleString()}</strong> results for &quot;{query}&quot; · showing {sorted.length}</>
            ) : status === 'idle' ? (
              'Type a product name to begin.'
            ) : null}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ font: '500 11px/1 var(--mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }} htmlFor="sort">Sort</label>
            <select
              id="sort"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)' }}
            >
              <option value="rel">Relevance</option>
              <option value="mgB2b">B2B margin — high to low</option>
              <option value="profit">Profit per unit</option>
              <option value="priceAsc">B2B price — low to high</option>
              <option value="priceDesc">B2B price — high to low</option>
              <option value="orders">Most ordered</option>
            </select>
            <label style={{ font: '500 11px/1 var(--mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }} htmlFor="per">Per page</label>
            <select
              id="per"
              value={per}
              onChange={(e) => { setPer(+e.target.value); if (query) { setPage(1); doSearch(query, 1, +e.target.value) } }}
              style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)' }}
            >
              <option value={10}>10</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(232px,1fr))', gap: 16, paddingBottom: 40 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--panel)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', height: 300, animation: 'pulse 1.2s ease-in-out infinite' }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: '70px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <h3 style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', color: 'var(--text)', margin: '0 0 8px', fontSize: 18 }}>Request failed</h3>
            <p style={{ margin: 0, fontSize: 14 }}>The API may be unreachable or blocked.</p>
            <p style={{ marginTop: 14 }}><code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--b2c)' }}>{error}</code></p>
          </div>
        ) : sorted.length === 0 && status !== 'idle' ? (
          <div style={{ padding: '70px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <h3 style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', color: 'var(--text)', margin: '0 0 8px', fontSize: 18 }}>Nothing matched &quot;{query}&quot;</h3>
            <p style={{ margin: 0, fontSize: 14 }}>Try a brand or a generic name — the search matches product titles.</p>
          </div>
        ) : sorted.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(232px,1fr))', gap: 16, paddingBottom: 40 }}>
            {sorted.map((p) => (
              <ProductCard key={p.p_id} product={p} onClick={() => openDetail(p)} />
            ))}
          </div>
        ) : null}

        {/* Pagination */}
        {sorted.length > 0 && !loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '8px 0 60px' }}>
            <button
              disabled={page <= 1}
              onClick={() => run(page - 1)}
              style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '9px 16px', font: '500 13px var(--mono)', background: 'var(--panel)', opacity: page <= 1 ? 0.35 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
            >
              ← Previous
            </button>
            <span style={{ font: '500 12px var(--mono)', color: 'var(--muted)' }}>Page {page} of {pages}</span>
            <button
              disabled={page >= pages}
              onClick={() => run(page + 1)}
              style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '9px 16px', font: '500 13px var(--mono)', background: 'var(--panel)', opacity: page >= pages ? 0.35 : 1, cursor: page >= pages ? 'not-allowed' : 'pointer' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Scrim */}
      <div
        onClick={closeDetail}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(6,8,12,.7)',
          backdropFilter: 'blur(3px)',
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'auto' : 'none',
          transition: 'opacity .2s',
          zIndex: 50,
        }}
      />

      {/* Detail Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Product pricing detail"
        style={{
          position: 'fixed', top: 0, right: 0,
          height: '100%', width: 'min(760px, 100%)',
          zIndex: 60,
          background: 'var(--bg)',
          borderLeft: '1px solid var(--line)',
          transform: drawerOpen ? 'none' : 'translateX(102%)',
          transition: 'transform .26s cubic-bezier(.32,.72,0,1)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        {selected && <ProductDetail product={selected} onClose={closeDetail} />}
      </aside>
    </div>
  )
}
