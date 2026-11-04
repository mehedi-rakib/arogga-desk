'use client'

export default function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--line-soft)',
        borderRadius: 'var(--r)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 290,
        animation: 'pulse 1.5s infinite',
      }}
    />
  )
}
