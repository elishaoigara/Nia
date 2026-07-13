'use client'

import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 500)
    const removeTimer = setTimeout(() => setVisible(false), 750)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-0)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 250ms ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <img src="/logo/nia-icon.svg" alt="" width={64} height={64} style={{ borderRadius: 18 }} />
    </div>
  )
}