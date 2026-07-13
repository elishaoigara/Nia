'use client'

import { useEffect, useState } from 'react'

const LINES = [
  'One continent. Every voice.',
  '54 countries. One conversation.',
  'From Cairo to Cape Town, one feed.',
  "Your circle isn't bound by borders.",
]

export default function UnityLine() {
  const [i, setI] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % LINES.length), 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <p
      key={i}
      style={{
        fontSize: 12.5,
        color: 'var(--text-tertiary)',
        margin: '6px 0 0',
        opacity: 0.85,
        animation: 'fade-in 0.5s ease',
      }}
    >
      {LINES[i]}
    </p>
  )
}