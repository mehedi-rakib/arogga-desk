'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

export default function AdminPage() {
  const params = useParams()
  const secret = params.secret as string

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!newPassword || !newPasswordConfirm) {
      setError('New password is required')
      return
    }

    if (newPassword !== newPasswordConfirm) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: secret,
          oldPassword,
          newPassword,
        }),
      })

      const json = await res.json()

      if (res.ok) {
        setMessage('Password changed successfully! ✅')
        setOldPassword('')
        setNewPassword('')
        setNewPasswordConfirm('')
      } else {
        setError(json.error || 'Failed to change password')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#12141c', color: '#e7e9ef', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#191d28', border: '1px solid #2c3246', borderRadius: '10px', padding: '40px', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '30px', textAlign: 'center' }}>Admin Panel</h1>

        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#8991a6' }}>
              Current Password
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter current password"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #2c3246',
                borderRadius: '6px',
                background: '#212636',
                color: '#e7e9ef',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#8991a6' }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #2c3246',
                borderRadius: '6px',
                background: '#212636',
                color: '#e7e9ef',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#8991a6' }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              placeholder="Confirm new password"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #2c3246',
                borderRadius: '6px',
                background: '#212636',
                color: '#e7e9ef',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: '6px', color: '#ff6b6b', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(53,208,165,0.1)', border: '1px solid #35d0a5', borderRadius: '6px', color: '#35d0a5', fontSize: '14px' }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#5f677c' : '#35d0a5',
              color: '#12141c',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>

        <p style={{ marginTop: '30px', fontSize: '12px', color: '#5f677c', textAlign: 'center' }}>
          Hidden Admin Panel
        </p>
      </div>
    </div>
  )
}
