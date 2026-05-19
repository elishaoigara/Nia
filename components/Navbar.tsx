'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Compass, Users, User, Search,
  Bell, Plus, Clapperboard, MessageSquare,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const LINKS = [
  { href: '/',             icon: Home,          label: 'Home',      mobile: true  },
  { href: '/discover',     icon: Compass,       label: 'Discover',  mobile: true  },
  { href: '/flicks',       icon: Clapperboard,  label: 'Flicks',    mobile: true  },
  { href: '/search',       icon: Search,        label: 'Search',    mobile: true  },
  { href: '/messages',     icon: MessageSquare, label: 'Messages',  mobile: true  },
  { href: '/circles',      icon: Users,         label: 'Circles',   mobile: false },
  { href: '/profile',      icon: User,          label: 'Me',        mobile: true  },
]

export default function Navbar() {
  const pathname = usePathname()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  // Load auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [])

  // Restore collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('nia-sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  // Sync CSS variable + localStorage whenever collapsed changes
  useEffect(() => {
    const w = collapsed ? '64px' : '240px'
    document.documentElement.style.setProperty('--sidebar-w', w)
    document.documentElement.setAttribute('data-sidebar', collapsed ? 'collapsed' : 'expanded')
    localStorage.setItem('nia-sidebar-collapsed', String(collapsed))
  }, [collapsed])

  if (pathname === '/flicks') return null

  return (
    <>
      {/* ── Top header bar ───────────────────────────────── */}
      <header
        className="fixed top-0 right-0 z-50 h-14 flex items-center justify-between px-4"
        style={{
          left: 0,
          background: 'var(--surface-0)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Mobile logo (sidebar hides this on desktop via sm:hidden) */}
        <Link href="/" className="flex items-center gap-2 select-none sm:invisible" aria-label="Nia">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-base" style={{ background: 'var(--grad-brand)' }}>N</div>
          <span className="font-extrabold text-lg tracking-tight">Nia</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {userId && <NotificationBell userId={userId} />}
          <Link
            href="/#compose"
            className="flex items-center gap-1.5 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition-all active:scale-95"
            style={{ background: 'var(--grad-brand)', boxShadow: '0 4px 14px rgba(168,85,247,0.3)', minHeight: 36 }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden xs:inline">Post</span>
          </Link>
        </div>
      </header>

      {/* ── Mobile bottom nav ────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around sm:hidden"
        style={{
          background: 'var(--surface-0)',
          borderTop: '1px solid var(--border)',
          height: 'var(--nav-bottom)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {LINKS.filter(l => l.mobile).map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} aria-label={label}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
              style={{ minHeight: 48 }}
            >
              <div className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
                style={active ? { background: 'linear-gradient(135deg,rgba(255,107,107,0.15),rgba(168,85,247,0.15))' } : {}}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} style={{ color: active ? 'var(--nia-violet)' : 'var(--text-tertiary)' }} />
              </div>
              <span className="text-[9px] font-semibold" style={{ color: active ? 'var(--nia-violet)' : 'var(--text-tertiary)' }}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* ── Desktop sidebar ──────────────────────────────── */}
      <aside
        className="nia-sidebar hidden sm:flex fixed left-0 top-0 h-full flex-col pt-4 pb-6"
        style={{
          background: 'var(--surface-0)',
          borderRight: '1px solid var(--border)',
          zIndex: 40,
        }}
      >
        {/* Logo row + collapse toggle */}
        <div className="flex items-center justify-between px-3 mb-5 mt-1 gap-2">
          <Link href="/" className="flex items-center gap-2.5 min-w-0 overflow-hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0" style={{ background: 'var(--grad-brand)' }}>N</div>
            <span className="sidebar-label font-extrabold text-xl tracking-tight">Nia</span>
          </Link>

          <button
            onClick={() => setCollapsed(c => !c)}
            className="sidebar-toggle shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav links */}
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {LINKS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="sidebar-link"
                title={collapsed ? label : undefined}
                style={active
                  ? { background: 'linear-gradient(135deg,rgba(255,107,107,0.12),rgba(168,85,247,0.12))', color: 'var(--nia-violet)' }
                  : { color: 'var(--text-secondary)' }}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} style={{ flexShrink: 0 }} />
                <span className="sidebar-label">{label}</span>
                {active && <div className="sidebar-active-dot ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--nia-violet)', flexShrink: 0 }} />}
              </Link>
            )
          })}

          {/* Notifications */}
          {userId && (() => {
            const active = pathname === '/notifications'
            return (
              <Link
                href="/notifications"
                className="sidebar-link"
                title={collapsed ? 'Notifications' : undefined}
                style={active
                  ? { background: 'linear-gradient(135deg,rgba(255,107,107,0.12),rgba(168,85,247,0.12))', color: 'var(--nia-violet)' }
                  : { color: 'var(--text-secondary)' }}
              >
                <Bell size={20} strokeWidth={active ? 2.5 : 1.8} style={{ flexShrink: 0 }} />
                <span className="sidebar-label">Notifications</span>
                {active && <div className="sidebar-active-dot ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--nia-violet)', flexShrink: 0 }} />}
              </Link>
            )
          })()}
        </div>

        {/* New Post button */}
        <div className="px-2 mt-4">
          <Link
            href="/#compose"
            className="btn-primary flex items-center justify-center gap-2 w-full"
            style={{ minHeight: 44, borderRadius: 14 }}
            title={collapsed ? 'New Post' : undefined}
          >
            <Plus size={18} strokeWidth={2.5} style={{ flexShrink: 0 }} />
            <span className="sidebar-label font-semibold">New Post</span>
          </Link>
        </div>
      </aside>
    </>
  )
}