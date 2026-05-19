'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusSquare, Heart, User, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

const NAV_ITEMS = [
  { href: '/',              icon: Home,       label: 'Home'     },
  { href: '/discover',      icon: Search,     label: 'Search'   },
  { href: '/?compose=1',   icon: PlusSquare, label: 'New post' },
  { href: '/notifications', icon: Heart,      label: 'Activity' },
  { href: '/profile',       icon: User,       label: 'Profile'  },
]

function ThemeButton() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const cycles = ['system', 'light', 'dark'] as const
  const next = cycles[(cycles.indexOf(theme as any) + 1) % cycles.length]
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const label = theme === 'system' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light'

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${label}`}
      title={`Theme: ${label} — click to change`}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 12px', borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--surface-2)',
        cursor: 'pointer', color: 'var(--text-secondary)',
        fontSize: 13, fontWeight: 500,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      <Icon size={15} strokeWidth={2} />
      <span style={{ fontSize: 12 }}>{label}</span>
    </button>
  )
}

export default function Navbar() {
  const pathname = usePathname()

  return (
    <>
      {/* ── Top header bar ──────────────────────────────── */}
      <header style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 'var(--nav-top)',
        background: 'var(--surface-0)',
        borderBottom: '1px solid var(--divider)',
        zIndex: 50,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        {/* Inner wrapper mirrors the body layout max-width */}
        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 'var(--sidebar-w)',
          paddingRight: 16,
          position: 'relative',
        }}
          className="header-inner"
        >
          {/* Wordmark — absolutely centered in entire header */}
          <Link href="/" style={{
            position: 'absolute', left: '50%',
            transform: 'translateX(-50%)',
            textDecoration: 'none',
          }}>
            <span className="feed-wordmark text-grad">Nia</span>
          </Link>

          {/* Right: theme toggle */}
          <div style={{ marginLeft: 'auto' }}>
            <ThemeButton />
          </div>
        </div>
      </header>

      {/* ── Desktop left sidebar ────────────────────────── */}
      <nav className="desktop-sidebar">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '11px 14px', borderRadius: 14,
                textDecoration: 'none',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: active ? 700 : 400,
                fontSize: 16,
                transition: 'background 0.15s, color 0.15s',
                background: active ? 'var(--surface-2)' : 'transparent',
              }}
            >
              <Icon size={24} strokeWidth={active ? 2.5 : 1.75} />
              <span style={{ letterSpacing: '-0.2px' }}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Mobile bottom tab bar ───────────────────────── */}
      <nav className="mobile-bottom-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '6px 14px', borderRadius: 12,
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              aria-label={item.label}
            >
              <Icon size={25} strokeWidth={active ? 2.5 : 1.75} />
            </Link>
          )
        })}
      </nav>
    </>
  )
}