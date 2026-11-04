'use client'

import { useEffect, useState } from 'react'

interface Setting {
  key: string
  value: string
  type: 'string' | 'number' | 'boolean' | 'json'
  label: string
  description: string
}

export default function DashboardSettings() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(j => {
        const data: Setting[] = j.data ?? []
        setSettings(data)
        setValues(Object.fromEntries(data.map(s => [s.key, s.value])))
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  const dirty = settings.some(s => values[s.key] !== s.value)

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const j = await res.json()
      const data: Setting[] = j.data ?? []
      setSettings(data)
      setValues(Object.fromEntries(data.map(s => [s.key, s.value])))
      setSavedAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-.02em' }}>
        Settings
      </h1>
      <p style={{ font: '13px/1.5 var(--mono)', color: 'var(--muted)', margin: '0 0 22px' }}>
        Site-wide configuration for the catalog dashboard.
      </p>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ padding: '18px 20px', borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ height: 14, width: 160, borderRadius: 4, background: 'var(--line-soft)', animation: 'pulse 1.2s infinite', marginBottom: 10 }} />
              <div style={{ height: 34, width: '100%', maxWidth: 360, borderRadius: 8, background: 'var(--line-soft)', animation: 'pulse 1.2s infinite' }} />
            </div>
          ))
        ) : (
          settings.map((s, i) => (
            <div
              key={s.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 20,
                padding: '18px 20px',
                borderBottom: i < settings.length - 1 ? '1px solid var(--line-soft)' : 'none',
              }}
            >
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{s.label || s.key}</div>
                <div style={{ font: '400 11.5px/1.5 var(--mono)', color: 'var(--dim)', marginTop: 3 }}>{s.description}</div>
              </div>

              <div style={{ flex: '0 0 260px' }}>
                {s.type === 'boolean' ? (
                  <button
                    onClick={() => setValues(v => ({ ...v, [s.key]: v[s.key] === 'true' ? 'false' : 'true' }))}
                    style={{
                      width: 46, height: 26, borderRadius: 13, position: 'relative',
                      background: values[s.key] === 'true' ? 'var(--b2b)' : 'var(--line)',
                      border: 0, cursor: 'pointer', transition: 'background .15s',
                    }}
                    aria-label={s.label}
                  >
                    <span style={{
                      position: 'absolute', top: 3, left: values[s.key] === 'true' ? 23 : 3,
                      width: 20, height: 20, borderRadius: '50%', background: '#fff',
                      transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
                    }} />
                  </button>
                ) : (
                  <input
                    type={s.type === 'number' ? 'number' : 'text'}
                    value={values[s.key] ?? ''}
                    onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                    style={{
                      width: '100%', background: 'var(--bg)', border: '1px solid var(--line)',
                      borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)',
                      font: '13px var(--mono)',
                    }}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20 }}>
        <button
          onClick={save}
          disabled={!dirty || saving}
          style={{
            background: 'var(--b2b)', color: '#06251c', fontWeight: 600, fontSize: 13,
            padding: '10px 20px', borderRadius: 8, border: 0,
            cursor: dirty && !saving ? 'pointer' : 'default',
            opacity: dirty && !saving ? 1 : 0.5,
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {!dirty && savedAt && (
          <span style={{ font: '500 12px var(--mono)', color: 'var(--dim)' }}>Saved ✓</span>
        )}
        {error && <span style={{ font: '500 12px var(--mono)', color: 'var(--alert)' }}>{error}</span>}
      </div>
    </div>
  )
}
