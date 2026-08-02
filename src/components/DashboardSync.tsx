'use client'

import { useEffect, useRef, useState } from 'react'

interface SyncStats {
  count: number
  newest: { p_name: string; updated_at: string } | null
}

interface Progress {
  done: number
  totalPages: number
  total: number
  inserted: number
  updated: number
  skipped: number
  errors: number
}

type Phase = 'idle' | 'connecting' | 'running' | 'done' | 'stopped' | 'error'

interface DeepProgress {
  currentTerm: string
  queueSize: number
  termsExplored: number
  termsConsumed: number
  uniqueFound: number
  catalogTotal: number
  requests: number
  inserted: number
  updated: number
  skipped: number
  errors: number
  stoppedOnBudget?: boolean
}

export default function DashboardSync() {
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState<Progress | null>(null)
  const [stopReason, setStopReason] = useState('')
  const [error, setError] = useState('')
  const [startPage, setStartPage] = useState(1)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [deepPhase, setDeepPhase] = useState<Phase>('idle')
  const [deepProgress, setDeepProgress] = useState<DeepProgress | null>(null)
  const [deepError, setDeepError] = useState('')
  const [maxRequests, setMaxRequests] = useState(5000)
  const [deepStartedAt, setDeepStartedAt] = useState<number | null>(null)
  const deepAbortRef = useRef<AbortController | null>(null)

  const loadStats = () => {
    fetch('/api/sync')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }

  useEffect(() => { loadStats() }, [])

  async function run() {
    setPhase('connecting')
    setError('')
    setStopReason('')
    setProgress(null)
    setStartedAt(Date.now())

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startPage }),
        signal: controller.signal,
      })
      if (!res.body) throw new Error('No response stream from server')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let idx: number
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 1)
          if (!line.trim()) continue

          const evt = JSON.parse(line)
          if (evt.event === 'connected') {
            setPhase('running')
          } else if (evt.event === 'progress') {
            setPhase('running')
            setProgress(evt)
          } else if (evt.event === 'done') {
            setPhase('done')
            setProgress(evt)
            loadStats()
          } else if (evt.event === 'stopped') {
            setPhase('stopped')
            setProgress(evt)
            setStopReason(evt.reason)
            if (typeof evt.page === 'number') setStartPage(evt.page)
            loadStats()
          } else if (evt.event === 'error') {
            setPhase('error')
            setError(evt.message)
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setPhase('error')
        setError(e instanceof Error ? e.message : String(e))
      }
    }
  }

  function stop() {
    abortRef.current?.abort()
    setPhase('idle')
  }

  async function runDeep() {
    setDeepPhase('connecting')
    setDeepError('')
    setDeepProgress(null)
    setDeepStartedAt(Date.now())

    const controller = new AbortController()
    deepAbortRef.current = controller

    try {
      const res = await fetch('/api/sync/deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxRequests }),
        signal: controller.signal,
      })
      if (!res.body) throw new Error('No response stream from server')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let idx: number
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 1)
          if (!line.trim()) continue

          const evt = JSON.parse(line)
          if (evt.event === 'connected') {
            setDeepPhase('running')
          } else if (evt.event === 'progress') {
            setDeepPhase('running')
            setDeepProgress(evt)
          } else if (evt.event === 'done') {
            setDeepPhase('done')
            setDeepProgress(evt)
            loadStats()
          } else if (evt.event === 'error') {
            setDeepPhase('error')
            setDeepError(evt.message)
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setDeepPhase('error')
        setDeepError(e instanceof Error ? e.message : String(e))
      }
    }
  }

  function stopDeep() {
    deepAbortRef.current?.abort()
    setDeepPhase('idle')
  }

  const running = phase === 'connecting' || phase === 'running'
  const pct = progress && progress.totalPages ? Math.round((progress.done / progress.totalPages) * 100) : 0
  const elapsed = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0

  const deepRunning = deepPhase === 'connecting' || deepPhase === 'running'
  const coveragePct = deepProgress && deepProgress.catalogTotal
    ? Math.min(100, Math.round((deepProgress.uniqueFound / deepProgress.catalogTotal) * 100))
    : 0
  const deepElapsed = deepStartedAt ? Math.round((Date.now() - deepStartedAt) / 1000) : 0

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-.02em' }}>
        Sync
      </h1>
      <p style={{ font: '13px/1.5 var(--mono)', color: 'var(--muted)', margin: '0 0 22px' }}>
        Fetch every product from the upstream Arogga catalog and reconcile it with MySQL —
        matched by <code>p_id</code>, variants matched by <code>pv_id</code>.
      </p>

      {/* Current DB state */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ font: '500 11px/1 var(--mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8 }}>Products in DB</div>
          <div style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontSize: 26, fontWeight: 700 }}>
            {stats ? stats.count.toLocaleString() : '—'}
          </div>
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ font: '500 11px/1 var(--mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8 }}>Last updated</div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>
            {stats?.newest ? new Date(stats.newest.updated_at).toLocaleString() : '—'}
          </div>
          <div style={{ font: '12px var(--mono)', color: 'var(--muted)', marginTop: 2 }}>{stats?.newest?.p_name ?? ''}</div>
        </div>
      </div>

      {/* Issue banner — shown prominently above the controls when a run stops early */}
      {phase === 'stopped' && (
        <div style={{
          background: 'rgba(255,107,107,.08)', border: '1px solid var(--alert)', borderRadius: 12,
          padding: '16px 20px', marginBottom: 20,
        }}>
          <div style={{ font: '600 13px/1 var(--mono)', color: 'var(--alert)', marginBottom: 6 }}>
            ⛔ Sync stopped — an issue prevented it from finishing
          </div>
          <div style={{ font: '13px/1.5 var(--mono)', color: 'var(--text)' }}>{stopReason}</div>
        </div>
      )}

      {/* Controls */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            onClick={run}
            disabled={running}
            style={{
              background: 'var(--b2b)', color: '#06251c', fontWeight: 600, fontSize: 13,
              padding: '10px 20px', borderRadius: 8, border: 0,
              cursor: running ? 'default' : 'pointer', opacity: running ? 0.5 : 1,
            }}
          >
            {running ? 'Syncing…' : 'Fetch All Products'}
          </button>

          {running && (
            <button
              onClick={stop}
              style={{ background: 'none', border: '1px solid var(--line)', color: 'var(--alert)', fontSize: 13, fontWeight: 600, padding: '10px 16px', borderRadius: 8, cursor: 'pointer' }}
            >
              Stop
            </button>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', font: '500 11px/1 var(--mono)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--dim)' }}>
            Resume from page
            <input
              type="number"
              min={1}
              value={startPage}
              disabled={running}
              onChange={e => setStartPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{ width: 70, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, padding: '6px 8px', fontSize: 12, color: 'var(--text)', font: '12px var(--mono)' }}
            />
          </label>
        </div>

        {(progress || running) && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', font: '500 12px var(--mono)', color: 'var(--muted)', marginBottom: 8 }}>
              <span>
                {progress ? `Page ${progress.done.toLocaleString()} / ${progress.totalPages.toLocaleString()}` : 'Connecting…'}
                {progress ? ` · ${pct}%` : ''}
              </span>
              <span>{elapsed}s elapsed</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--line-soft)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: phase === 'stopped' || phase === 'error' ? 'var(--alert)' : 'var(--b2b)', transition: 'width .2s' }} />
            </div>
          </div>
        )}

        {progress && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginTop: 20 }}>
            {[
              { label: 'Total upstream', value: progress.total, color: 'var(--text)' },
              { label: 'Inserted (new)', value: progress.inserted, color: 'var(--b2b)' },
              { label: 'Updated (matched)', value: progress.updated, color: 'var(--b2c)' },
              { label: 'Unchanged', value: progress.skipped, color: 'var(--dim)' },
              { label: 'Errors', value: progress.errors, color: 'var(--alert)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg)', border: '1px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ font: '500 10px/1 var(--mono)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6 }}>{s.label}</div>
                <div style={{ font: '600 16px var(--mono)', color: s.color }}>{s.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {phase === 'done' && (
          <div style={{ marginTop: 16, font: '600 13px var(--mono)', color: 'var(--b2b)' }}>✔ Sync complete</div>
        )}
        {error && (
          <div style={{ marginTop: 16, font: '500 13px var(--mono)', color: 'var(--alert)' }}>{error}</div>
        )}
      </div>

      {/* Deep crawl — works around the ~1,000-item plain-pagination ceiling */}
      <h2 style={{ fontFamily: 'var(--font-space-grotesk, Space Grotesk, sans-serif)', fontSize: 16, fontWeight: 700, margin: '28px 0 6px', letterSpacing: '-.02em' }}>
        Deep Crawl
      </h2>
      <p style={{ font: '13px/1.5 var(--mono)', color: 'var(--muted)', margin: '0 0 14px' }}>
        Plain pagination above only ever reaches ~1,000 products, no matter what the total says — that&rsquo;s
        a ceiling on the upstream API itself. This instead searches many narrow terms and combines the results
        to reach much further into the catalog. It&rsquo;s best-effort: it can&rsquo;t guarantee literally 100% coverage,
        and it makes many more requests, so it runs slower.
      </p>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            onClick={runDeep}
            disabled={deepRunning}
            style={{
              background: 'var(--b2b)', color: '#06251c', fontWeight: 600, fontSize: 13,
              padding: '10px 20px', borderRadius: 8, border: 0,
              cursor: deepRunning ? 'default' : 'pointer', opacity: deepRunning ? 0.5 : 1,
            }}
          >
            {deepRunning ? 'Crawling…' : 'Start Deep Crawl'}
          </button>

          {deepRunning && (
            <button
              onClick={stopDeep}
              style={{ background: 'none', border: '1px solid var(--line)', color: 'var(--alert)', fontSize: 13, fontWeight: 600, padding: '10px 16px', borderRadius: 8, cursor: 'pointer' }}
            >
              Stop
            </button>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', font: '500 11px/1 var(--mono)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--dim)' }}>
            Request budget
            <input
              type="number"
              min={100}
              step={100}
              value={maxRequests}
              disabled={deepRunning}
              onChange={e => setMaxRequests(Math.max(100, parseInt(e.target.value, 10) || 100))}
              style={{ width: 90, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, padding: '6px 8px', fontSize: 12, color: 'var(--text)', font: '12px var(--mono)' }}
            />
          </label>
        </div>

        {(deepProgress || deepRunning) && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', font: '500 12px var(--mono)', color: 'var(--muted)', marginBottom: 8 }}>
              <span>
                {deepProgress
                  ? `${deepProgress.uniqueFound.toLocaleString()} / ${deepProgress.catalogTotal.toLocaleString()} products found · ${coveragePct}% coverage`
                  : 'Connecting…'}
              </span>
              <span>{deepElapsed}s elapsed</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--line-soft)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${coveragePct}%`, background: deepPhase === 'error' ? 'var(--alert)' : 'var(--b2b)', transition: 'width .2s' }} />
            </div>
            {deepProgress && (
              <div style={{ font: '12px var(--mono)', color: 'var(--dim)', marginTop: 8 }}>
                exploring &ldquo;{deepProgress.currentTerm}&rdquo; · queue: {deepProgress.queueSize.toLocaleString()} ·
                {' '}terms explored: {deepProgress.termsExplored.toLocaleString()} ·
                {' '}requests: {deepProgress.requests.toLocaleString()} / {maxRequests.toLocaleString()}
              </div>
            )}
          </div>
        )}

        {deepProgress && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginTop: 20 }}>
            {[
              { label: 'Found / total', value: `${deepProgress.uniqueFound.toLocaleString()} / ${deepProgress.catalogTotal.toLocaleString()}`, color: 'var(--text)' },
              { label: 'Inserted (new)', value: deepProgress.inserted.toLocaleString(), color: 'var(--b2b)' },
              { label: 'Updated (matched)', value: deepProgress.updated.toLocaleString(), color: 'var(--b2c)' },
              { label: 'Unchanged', value: deepProgress.skipped.toLocaleString(), color: 'var(--dim)' },
              { label: 'Errors', value: deepProgress.errors.toLocaleString(), color: 'var(--alert)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg)', border: '1px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ font: '500 10px/1 var(--mono)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6 }}>{s.label}</div>
                <div style={{ font: '600 16px var(--mono)', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {deepPhase === 'done' && !deepProgress?.stoppedOnBudget && (
          <div style={{ marginTop: 16, font: '600 13px var(--mono)', color: 'var(--b2b)' }}>✔ Deep crawl finished — queue exhausted</div>
        )}
        {deepPhase === 'done' && deepProgress?.stoppedOnBudget && (
          <div style={{ marginTop: 16, font: '600 13px var(--mono)', color: 'var(--b2c)' }}>
            ⚠ Stopped — request budget ({maxRequests.toLocaleString()}) reached with terms still queued. Raise the budget and run again to continue.
          </div>
        )}
        {deepError && (
          <div style={{ marginTop: 16, font: '500 13px var(--mono)', color: 'var(--alert)' }}>{deepError}</div>
        )}
      </div>
    </div>
  )
}
