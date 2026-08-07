'use client'

import { useEffect, useState } from 'react'

export default function WelcomeBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setShow(!localStorage.getItem('nia_welcome_seen'))
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  if (!show) return null

  return (
    <div
      style={{
        background: 'var(--grad-brand)', color: '#fff',
        padding: '12px 16px', borderRadius: 12, margin: '0 0 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
      }}
    >
      <span style={{ fontSize: 13.5, fontWeight: 500 }}>
        Welcome to Nia — Africa connects here
      </span>
      <button
        onClick={() => { localStorage.setItem('nia_welcome_seen', '1'); setShow(false) }}
        className="tap-sm"
        style={{
          background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff',
          fontSize: 12.5, fontWeight: 700, padding: '5px 12px', borderRadius: 8,
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        Got it
      </button>
    </div>
  )
}