'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Compass, Users, User, Search, Bell, Plus, ShoppingBag,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const links = [
  { href: '/',            icon: Home,        label: 'Home'    },
  { href: '/discover',    icon: Compass,     label: 'Discover'},
  { href: '/search',      icon: Search,      label: 'Search'  },
  { href: '/circles',     icon: Users,       label: 'Circles' },
  { href: '/marketplace', icon: ShoppingBag, label: 'Market'  },
  { href: '/profile',     icon: User,        label: 'Me'      },
]

export default function Navbar() {
  const pathname = usePathname()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) =>
      setUserId(user?.id ?? null)
    )
  }, [])

  return (
    <>
      {/* ── Top bar (always visible) ──────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:left-60"
        style={{
          background: 'var(--surface-0)',
          borderBottom: '1px solid var(--border)',
          /* Blur glass effect for a polished feel */
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Brand mark */}
        <Link
          href="/"
          className="flex items-center gap-2 select-none"
          aria-label="Nia home"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-base"
            style={{ background: 'var(--grad-brand)' }}
          >
            N
          </div>
          <span className="font-extrabold text-lg tracking-tight hidden sm:block">
            Nia
          </span>
        </Link>

        {/* Right cluster */}
        <div className="flex items-center gap-1.5">
          {/* Theme toggle — visible everywhere */}
          <ThemeToggle />

          {userId && <NotificationBell userId={userId} />}

          <Link
            href="/#compose"
            className="flex items-center gap-1.5 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition-all active:scale-95"
            style={{
              background: 'var(--grad-brand)',
              boxShadow: '0 4px 14px rgba(168,85,247,0.35)',
              minHeight: '36px',
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden xs:inline">Post</span>
          </Link>
        </div>
      </header>

      {/* ── Bottom nav (mobile only) ───────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around sm:hidden safe-bottom"
        style={{
          background: 'var(--surface-0)',
          borderTop: '1px solid var(--border)',
          height: 'var(--nav-bottom)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-2xl transition-all active:scale-90"
              style={{ minHeight: '48px' }}
            >
              <div
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
                style={
                  active
                    ? {
                        background:
                          'linear-gradient(135deg,rgba(255,107,107,0.15),rgba(168,85,247,0.15))',
                      }
                    : {}
                }
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.8}
                  style={{ color: active ? 'var(--nia-violet)' : 'var(--text-tertiary)' }}
                />
              </div>
              <span
                className="text-[9px] font-semibold"
                style={{ color: active ? 'var(--nia-violet)' : 'var(--text-tertiary)' }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* ── Side nav (desktop only) ────────────────────────── */}
      <aside
        className="hidden sm:flex fixed left-0 top-0 h-full flex-col px-3 pt-16 pb-6"
        style={{
          background: 'var(--surface-0)',
          borderRight: '1px solid var(--border)',
          width: '240px',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3 mb-6">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg"
            style={{ background: 'var(--grad-brand)' }}
          >
            N
          </div>
          <span className="font-extrabold text-xl tracking-tight">Nia</span>
        </div>

        {/* Nav links */}
        <div className="flex-1 space-y-1 overflow-y-auto">
          {links.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all"
                style={
                  active
                    ? {
                        background:
                          'linear-gradient(135deg,rgba(255,107,107,0.12),rgba(168,85,247,0.12))',
                        color: 'var(--nia-violet)',
                      }
                    : { color: 'var(--text-secondary)' }
                }
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {label}
                {active && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--nia-violet)' }}
                  />
                )}
              </Link>
            )
          })}

          {/* Notifications link (desktop sidebar only) */}
          {userId && (
            <Link
              href="/notifications"
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all"
              style={
                pathname === '/notifications'
                  ? {
                      background:
                        'linear-gradient(135deg,rgba(255,107,107,0.12),rgba(168,85,247,0.12))',
                      color: 'var(--nia-violet)',
                    }
                  : { color: 'var(--text-secondary)' }
              }
            >
              <Bell
                size={20}
                strokeWidth={pathname === '/notifications' ? 2.5 : 1.8}
              />
              Notifications
            </Link>
          )}
        </div>

        {/* New Post CTA */}
        <Link
          href="/#compose"
          className="btn-primary flex items-center justify-center gap-2 mt-4 w-full"
        >
          <Plus size={18} strokeWidth={2.5} /> New Post
        </Link>
      </aside>
    </>
  )
}