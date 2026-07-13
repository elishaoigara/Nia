'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, Compass, Clapperboard,
  MessageSquare, User, Plus,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle      from '@/components/ThemeToggle'
import LogoutButton     from '@/components/LogoutButton'
import { createClient } from '@/lib/supabase/client'

/* ── 5 nav items only ─────────────────────────────────────
   Discover absorbed Search → /explore
   Circles lives under Me (/profile → circles tab)
   Notifications → bell icon in top bar (already there)
*/
const LINKS = [
  { href: '/',         icon: Home,          label: 'Home'     },
  { href: '/explore',  icon: Compass,       label: 'Explore'  },
  { href: '/flicks',   icon: Clapperboard,  label: 'Flicks'   },
  { href: '/messages', icon: MessageSquare, label: 'Messages' },
  { href: '/profile',  icon: User,          label: 'Me'       },
]

export default function Navbar() {
  const pathname = usePathname() ?? ''
  const router   = useRouter()
  const supabase = createClient()

  const [userId,         setUserId]         = useState<string | null>(null)
  const [unreadMessages, setUnreadMessages] = useState(0)

  function scrollToCompose() {
    if (pathname !== '/') { router.push('/#compose'); return }
    const el = document.getElementById('compose')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const textarea = el.querySelector('textarea')
      textarea?.focus()
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      const fetchUnread = async () => {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('is_read', false)
        setUnreadMessages(count ?? 0)
      }
      fetchUnread()

      const ch = supabase.channel('nav-msgs')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        }, () => setUnreadMessages(p => p + 1))
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        }, fetchUnread)
        .subscribe()

      return () => { supabase.removeChannel(ch) }
    })
  }, []) // eslint-disable-line

  const isFlicks   = pathname === '/flicks'
  const isDmThread = pathname.startsWith('/messages/') && pathname.split('/').length === 3

  function isActive(href: string) {
    if (href === '/')         return pathname === '/'
    if (href === '/messages') return pathname.startsWith('/messages')
    if (href === '/profile')  return pathname.startsWith('/profile')
    if (href === '/explore')  return pathname.startsWith('/explore') || pathname === '/discover' || pathname === '/search'
    return pathname.startsWith(href)
  }

  if (isFlicks) return null

  /* ── Sidebar active style (desktop) ── */
  const activeStyle = {
    background: 'rgba(91, 33, 182, 0.10)',
    color: 'var(--nia-violet)',
  } as const

  return (
    <>
      {/* ── TOP BAR ─────────────────────────────────────── */}
      {!isDmThread && (
        <header style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 'var(--nav-top)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
          background: 'var(--surface-0)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
          {/* Logo — mobile only (desktop has sidebar logo) */}
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
            className="hide-on-desktop"
            aria-label="Nia home"
          >
            <img src="/logo/nia-icon.svg" alt="" width={30} height={30} style={{ borderRadius: 10 }} />
            <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)' }}>Nia</span>
          </Link>

          {/* Right cluster — notification + post only (ThemeToggle → sidebar, Logout → sidebar) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <ThemeToggle />
            {userId && <NotificationBell userId={userId} />}
            <button
              onClick={scrollToCompose}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--grad-brand)', color: '#fff',
                fontSize: 13, fontWeight: 700,
                padding: '7px 14px', borderRadius: 10,
                border: 'none', cursor: 'pointer', minHeight: 34,
              }}
              className="tap-sm"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span className="hidden xs:inline">Post</span>
            </button>
          </div>
        </header>
      )}

      {/* ── MOBILE BOTTOM TAB BAR ────────────────────────── */}
      {!isDmThread && (
        <nav
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            height: 'var(--nav-bottom)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'space-around',
            background: 'var(--surface-0)',
            borderTop: '1px solid var(--border)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          className="mobile-bottom-nav"
        >
          {LINKS.map(({ href, icon: Icon, label }) => {
            const active    = isActive(href)
            const showBadge = href === '/messages' && unreadMessages > 0

            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 0, flex: 1, padding: '4px 0',
                  textDecoration: 'none',
                }}
                className="tap-xs"
              >
                {/* Active dot indicator above pill */}
                <div style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: active ? 'var(--nia-accent-soft)' : 'transparent',
                  marginBottom: 3,
                  transition: 'background 0.2s',
                }} />

                {/* Icon + label pill */}
                <div style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 3,
                  padding: '5px 14px',
                  borderRadius: 14,
                  /* Pill: 14% opacity → visible even on OLED in sunlight */
                  background: active ? 'rgba(91,33,182,0.14)' : 'transparent',
                  transition: 'background 0.2s',
                }}>
                  <div style={{ position: 'relative' }}>
                    <Icon
                      size={21}
                      /* Active: filled look via fill + zero stroke.
                         Inactive: outline with lighter weight. */
                      strokeWidth={active ? 0 : 1.8}
                      style={{
                        fill: active ? 'var(--nia-violet)' : 'none',
                        color: active ? 'var(--nia-violet)' : 'var(--text-tertiary)',
                        transition: 'fill 0.15s, color 0.15s',
                      }}
                    />
                    {showBadge && (
                      <span style={{
                        position: 'absolute', top: -4, right: -6,
                        minWidth: 15, height: 15, borderRadius: 8,
                        background: 'var(--nia-coral)', color: '#fff',
                        fontSize: 9, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px',
                      }}>
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: active ? 700 : 500,
                    color: active ? 'var(--nia-violet)' : 'var(--text-tertiary)',
                    lineHeight: 1,
                    letterSpacing: active ? '0.01em' : '0',
                    transition: 'color 0.15s, font-weight 0.15s',
                  }}>
                    {label}
                  </span>
                </div>
              </Link>
            )
          })}
        </nav>
      )}

      {/* ── DESKTOP SIDEBAR ──────────────────────────────── */}
      <aside
        className="desktop-sidebar"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 'var(--sidebar-w)', zIndex: 40,
          flexDirection: 'column',
          padding: '16px 12px 24px',
          background: 'var(--surface-0)',
          borderRight: '1px solid var(--border)',
          overflowY: 'auto',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', marginBottom: 20, textDecoration: 'none' }}>
          <img src="/logo/nia-icon.svg" alt="" width={34} height={34} style={{ borderRadius: 10 }} />
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>Nia</span>
        </Link>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {LINKS.map(({ href, icon: Icon, label }) => {
            const active    = isActive(href)
            const showBadge = href === '/messages' && unreadMessages > 0

            return (
              <Link
                key={href}
                href={href}
                className="tap-sm"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 14,
                  textDecoration: 'none',
                  fontSize: 15, fontWeight: active ? 700 : 500,
                  transition: 'background 0.15s, color 0.15s',
                  position: 'relative',
                  ...(active ? activeStyle : { color: 'var(--text-secondary)' }),
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Icon
                    size={20}
                    strokeWidth={active ? 0 : 1.8}
                    style={{
                      fill: active ? 'var(--nia-violet)' : 'none',
                      color: active ? 'var(--nia-violet)' : 'var(--text-secondary)',
                    }}
                  />
                  {showBadge && (
                    <span style={{
                      position: 'absolute', top: -4, right: -4,
                      minWidth: 15, height: 15, borderRadius: 8,
                      background: 'var(--nia-coral)', color: '#fff',
                      fontSize: 9, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 3px',
                    }}>
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </div>
                <span>{label}</span>
                {active && (
                  <div style={{
                    marginLeft: 'auto',
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--nia-violet)',
                  }} />
                )}
              </Link>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <button
            onClick={scrollToCompose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'var(--grad-brand)', color: '#fff',
              fontWeight: 700, fontSize: 14,
              padding: '12px', borderRadius: 14,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(91, 33, 182, 0.2)',
            }}
            className="tap-sm"
          >
            <Plus size={17} strokeWidth={2.5} />
            New Post
          </button>
          {userId && <LogoutButton />}
        </div>
      </aside>
    </>
  )
}