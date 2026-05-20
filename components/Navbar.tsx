'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Compass, Users, User, Search, Bell, Plus,
  Clapperboard, MessageSquare,
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
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
      if (user?.id) {
        // Count unread messages
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('is_read', false)
          .then(({ count }) => setUnreadMessages(count ?? 0))

        // Real-time updates for new messages
        const ch = supabase
          .channel('nav-msgs')
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'messages',
            filter: `recipient_id=eq.${user.id}`,
          }, () => setUnreadMessages(c => c + 1))
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'messages',
            filter: `recipient_id=eq.${user.id}`,
          }, () => {
            // Re-fetch count on read updates
            supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('recipient_id', user.id)
              .eq('is_read', false)
              .then(({ count }) => setUnreadMessages(count ?? 0))
          })
          .subscribe()
        return () => { supabase.removeChannel(ch) }
      }
    })
  }, [])

  // Hide nav entirely on the DM page on mobile (it takes full screen)
  const isDmPage = pathname.startsWith('/messages/') && pathname.split('/').length === 3

  if (pathname === '/flicks') return null

  // Helper: is a nav link "active"?
  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    if (href === '/messages') return pathname.startsWith('/messages')
    if (href === '/profile') return pathname.startsWith('/profile')
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Top bar ─────────────────────────────────── */}
      {!isDmPage && (
        <header
          className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:left-60"
          style={{
            background: 'var(--surface-0)',
            borderBottom: '1px solid var(--border)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          {/* Logo — shown on mobile only (desktop has it in sidebar) */}
          <Link href="/" className="flex items-center gap-2 select-none sm:invisible" aria-label="Nia home">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-base" style={{ background: 'var(--grad-brand)' }}>
              N
            </div>
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
      )}

      {/* ── Mobile bottom nav ───────────────────────── */}
      {!isDmPage && (
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
            const active = isActive(href)
            const showBadge = href === '/messages' && unreadMessages > 0
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
                style={{ minHeight: 48 }}
              >
                <div
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all"
                  style={active ? { background: 'linear-gradient(135deg,rgba(255,107,107,0.15),rgba(168,85,247,0.15))' } : {}}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} style={{ color: active ? 'var(--nia-violet)' : 'var(--text-tertiary)' }} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 min-w-46px] flex items-center justify-center text-white text-[9px] font-bold rounded-full px-0.5" style={{ background: 'var(--nia-coral)' }}>
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-semibold" style={{ color: active ? 'var(--nia-violet)' : 'var(--text-tertiary)' }}>
                  {label}
                </span>
              </Link>
            )
          })}
        </nav>
      )}

      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside
        className="hidden sm:flex fixed left-0 top-0 h-full flex-col px-3 pt-4 pb-6"
        style={{ background: 'var(--surface-0)', borderRight: '1px solid var(--border)', width: 240 }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 px-3 mb-6 mt-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg" style={{ background: 'var(--grad-brand)' }}>
            N
          </div>
          <span className="font-extrabold text-xl tracking-tight">Nia</span>
        </Link>

        <div className="flex-1 space-y-0.5 overflow-y-auto">
          {LINKS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            const showBadge = href === '/messages' && unreadMessages > 0
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[15px] font-semibold transition-all relative"
                style={active
                  ? { background: 'linear-gradient(135deg,rgba(255,107,107,0.12),rgba(168,85,247,0.12))', color: 'var(--nia-violet)' }
                  : { color: 'var(--text-secondary)' }}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-46px] flex items-center justify-center text-white text-[9px] font-bold rounded-full px-0.5" style={{ background: 'var(--nia-coral)' }}>
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </div>
                {label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--nia-violet)' }} />}
              </Link>
            )
          })}

          {userId && (
            <Link
              href="/notifications"
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[15px] font-semibold transition-all"
              style={pathname === '/notifications'
                ? { background: 'linear-gradient(135deg,rgba(255,107,107,0.12),rgba(168,85,247,0.12))', color: 'var(--nia-violet)' }
                : { color: 'var(--text-secondary)' }}
            >
              <Bell size={20} strokeWidth={pathname === '/notifications' ? 2.5 : 1.8} />
              Notifications
            </Link>
          )}
        </div>

        <Link href="/#compose" className="btn-primary flex items-center justify-center gap-2 mt-4 w-full">
          <Plus size={18} strokeWidth={2.5} /> New Post
        </Link>
      </aside>
    </>
  )
}