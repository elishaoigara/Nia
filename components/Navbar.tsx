'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusSquare, Heart, User, Edit3 } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',              icon: Home,       label: 'Home'     },
  { href: '/discover',      icon: Search,     label: 'Search'   },
  { href: '/?compose=1',   icon: PlusSquare, label: 'New post' },
  { href: '/notifications', icon: Heart,      label: 'Activity' },
  { href: '/profile',       icon: User,       label: 'Profile'  },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <>
      {/* Top bar — desktop sidebar, mobile top */}
      <header style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 'var(--nav-top)',
        background: 'var(--surface-0)',
        borderBottom: '1px solid var(--divider)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        {/* Nia wordmark */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span className="feed-wordmark text-grad">Nia</span>
        </Link>

        {/* Desktop compose shortcut */}
        <button
          style={{
            position: 'absolute', right: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}
          aria-label="New post"
        >
          <Edit3 size={17} strokeWidth={2} />
        </button>
      </header>

      {/* Desktop left sidebar (sm+) */}
      <nav style={{
        position: 'fixed',
        top: 'var(--nav-top)',
        left: 0,
        bottom: 0,
        width: 240,
        padding: '12px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        zIndex: 40,
      }} className="hidden sm:flex">
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
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '10px 12px',
                borderRadius: 12,
                textDecoration: 'none',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: active ? 700 : 400,
                fontSize: 16,
                transition: 'background 0.15s, color 0.15s',
                background: active ? 'var(--surface-2)' : 'transparent',
              }}
            >
              <Icon
                size={26}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span style={{ letterSpacing: '-0.2px' }}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Mobile bottom tab bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: 'var(--nav-bottom)',
        background: 'var(--surface-0)',
        borderTop: '1px solid var(--divider)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        zIndex: 50,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }} className="flex sm:hidden">
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
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 12px',
                borderRadius: 12,
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                textDecoration: 'none',
              }}
              aria-label={item.label}
            >
              <Icon
                size={26}
                strokeWidth={active ? 2.5 : 1.75}
              />
            </Link>
          )
        })}
      </nav>
    </>
  )
}
