'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export interface SelectOption {
  value: string
  label: string
  count?: number
}

interface Props {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  searchPlaceholder?: string
  style?: React.CSSProperties
}

export default function SearchableSelect({ options, value, onChange, placeholder, searchPlaceholder, style }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [cursor, setCursor] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const openDropdown = () => {
    setOpen(true)
    setSearch('')
    setCursor(-1)
    setTimeout(() => searchRef.current?.focus(), 0)
  }

  const closeDropdown = useCallback(() => {
    setOpen(false)
    setSearch('')
    setCursor(-1)
  }, [])

  const pick = (val: string) => {
    onChange(val)
    closeDropdown()
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, closeDropdown])

  // Keyboard nav
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') { closeDropdown(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, -1))
    } else if (e.key === 'Enter' && cursor >= 0) {
      e.preventDefault()
      const opt = filtered[cursor]
      if (opt) pick(opt.value)
    }
  }

  // Scroll cursor into view
  useEffect(() => {
    if (cursor < 0 || !listRef.current) return
    const item = listRef.current.children[cursor] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  // Reset cursor when filter changes
  useEffect(() => { setCursor(-1) }, [search])

  const triggerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    background: 'var(--panel)',
    border: `1px solid ${open ? 'var(--b2b)' : 'var(--line)'}`,
    borderRadius: 10,
    padding: '0 12px',
    fontSize: 13,
    color: value ? 'var(--text)' : 'var(--muted)',
    cursor: 'pointer',
    minWidth: 160,
    height: 42,
    minHeight: 42,
    whiteSpace: 'nowrap',
    textAlign: 'left',
    ...style,
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', minWidth: 160, ...style }}>
      <button type="button" style={triggerStyle} onClick={() => open ? closeDropdown() : openDropdown()}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
          {selected ? selected.label : placeholder}
        </span>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          minWidth: '100%',
          width: 'max-content',
          maxWidth: 320,
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          boxShadow: '0 12px 32px -8px rgba(0,0,0,.55)',
          zIndex: 200,
          overflow: 'hidden',
        }}>
          {/* Search input */}
          <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid var(--line-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 7, padding: '6px 10px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder ?? 'Search…'}
                style={{ flex: 1, background: 'none', border: 0, outline: 0, fontSize: 13, color: 'var(--text)' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 0, padding: 0, color: 'var(--dim)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
              )}
            </div>
          </div>

          {/* Options list */}
          <ul ref={listRef} style={{ listStyle: 'none', margin: 0, padding: '6px 0', maxHeight: 260, overflowY: 'auto' }}>
            {/* Clear option */}
            {value && (
              <li
                onClick={() => pick('')}
                style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <span style={{ opacity: 0.5 }}>✕</span> Clear selection
              </li>
            )}
            {filtered.length === 0 ? (
              <li style={{ padding: '10px 14px', font: '13px var(--mono)', color: 'var(--muted)', textAlign: 'center' }}>No results</li>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value
                const isCursor = i === cursor
                return (
                  <li
                    key={opt.value}
                    onClick={() => pick(opt.value)}
                    style={{
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      background: isSelected ? 'rgba(53,208,165,.1)' : isCursor ? 'var(--bg)' : '',
                      color: isSelected ? 'var(--b2b)' : 'var(--text)',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg)' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isCursor ? 'var(--bg)' : '' }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                    {opt.count != null && (
                      <span style={{ font: '500 11px var(--mono)', color: 'var(--dim)', flexShrink: 0 }}>{opt.count.toLocaleString()}</span>
                    )}
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
