'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Compass, Clapperboard, Search,
  MessageSquare, Users, User, Bell, Plus,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle      from '@/components/ThemeToggle'
import LogoutButton     from '@/components/LogoutButton'
import { createClient } from '@/lib/supabase/client'

/* ── Nav items ─────────────────────────────────────────────
   mobile: true  → show in bottom tab bar
   mobile: false → desktop sidebar only
*/
const LINKS = [
  { href: '/',         icon: Home,          label: 'Home',     mobile: true  },
  { href: '/discover', icon: Compass,       label: 'Discover', mobile: true  },
  { href: '/flicks',   icon: Clapperboard,  label: 'Flicks',   mobile: true  },
  { href: '/search',   icon: Search,        label: 'Search',   mobile: true  },
  { href: '/messages', icon: MessageSquare, label: 'Messages', mobile: true  },
  { href: '/circles',  icon: Users,         label: 'Circles',  mobile: false },
  { href: '/profile',  icon: User,          label: 'Me',       mobile: true  },
]

export default function Navbar() {
  const pathname = usePathname() ?? ''
  const supabase = createClient()

  const [userId,         setUserId]         = useState<string | null>(null)
  const [unreadMessages, setUnreadMessages] = useState(0)

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

  /* hide everything on fullscreen flicks page and DM pages */
  const isFlicks  = pathname === '/flicks'
  const isDmThread = pathname.startsWith('/messages/') && pathname.split('/').length === 3

  function isActive(href: string) {
    if (href === '/')         return pathname === '/'
    if (href === '/messages') return pathname.startsWith('/messages')
    if (href === '/profile')  return pathname.startsWith('/profile')
    return pathname.startsWith(href)
  }

  if (isFlicks) return null

  /* ── shared active style ─────────────────────────────── */
  const activeNavItem = {
    background: 'linear-gradient(135deg, rgba(255,107,107,0.12), rgba(139,92,246,0.12))',
    color: 'var(--nia-violet)',
  } as const

  return (
    <>
      {/* ══════════════════════════════════════════════════
          TOP BAR  (mobile + desktop)
          On desktop it sits to the right of the sidebar.
      ══════════════════════════════════════════════════ */}
      {!isDmThread && (
        <header style={{
          position:    'fixed',
          top:         0,
          left:        0,
          right:       0,
          height:      'var(--nav-top)',
          zIndex:      50,
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'space-between',
          padding:     '0 16px',
          background:  'var(--surface-0)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
          {/* Logo — visible on mobile, hidden on desktop (sidebar has it) */}
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
            className="sm:invisible"
            aria-label="Nia home"
          >
            <div style={{
              width: 30, height: 30, borderRadius: 10,
              background: 'var(--grad-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 15,
            }}>
              N
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)' }}>Nia</span>
          </Link>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ThemeToggle />
            {userId && <NotificationBell userId={userId} />}
            {userId && <LogoutButton variant="icon" />}
            <Link
              href="/#compose"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--grad-brand)',
                color: '#fff',
                fontSize: 13, fontWeight: 700,
                padding: '7px 14px',
                borderRadius: 10,
                textDecoration: 'none',
                minHeight: 34,
              }}
              className="tap-sm"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span className="hidden xs:inline">Post</span>
            </Link>
          </div>
        </header>
      )}

      {/* ══════════════════════════════════════════════════
          MOBILE BOTTOM TAB BAR
      ══════════════════════════════════════════════════ */}
      {!isDmThread && (
        <nav
          style={{
            position:       'fixed',
            bottom:         0,
            left:           0,
            right:          0,
            height:         'var(--nav-bottom)',
            zIndex:         50,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-around',
            background:     'var(--surface-0)',
            borderTop:      '1px solid var(--border)',
            paddingBottom:  'env(safe-area-inset-bottom, 0px)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          className="sm:hidden"
        >
          {LINKS.filter(l => l.mobile).map(({ href, icon: Icon, label }) => {
            const active    = isActive(href)
            const showBadge = href === '/messages' && unreadMessages > 0

            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                style={{
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            2,
                  flex:           1,
                  padding:        '6px 0',
                  textDecoration: 'none',
                }}
                className="tap-xs"
              >
                <div style={{
                  position:       'relative',
                  width:          36, height: 36,
                  borderRadius:   10,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  ...(active ? activeNavItem : {}),
                  transition: 'background 0.2s',
                }}>
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    color={active ? 'var(--nia-violet)' : 'var(--text-tertiary)'}
                  />
                  {showBadge && (
                    <span style={{
                      position:   'absolute',
                      top: -3, right: -3,
                      minWidth:   16, height: 16,
                      borderRadius: 8,
                      background: 'var(--nia-coral)',
                      color:      '#fff',
                      fontSize:   9, fontWeight: 800,
                      display:    'flex', alignItems: 'center', justifyContent: 'center',
                      padding:    '0 3px',
                    }}>
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize:   9,
                  fontWeight: 700,
                  color:      active ? 'var(--nia-violet)' : 'var(--text-tertiary)',
                }}>
                  {label}
                </span>
              </Link>
            )
          })}
        </nav>
      )}

      {/* ══════════════════════════════════════════════════
          DESKTOP SIDEBAR
      ══════════════════════════════════════════════════ */}
      <aside
        className="hidden sm:flex"
        style={{
          position:      'fixed',
          top:           0,
          left:          0,
          bottom:        0,
          width:         'var(--sidebar-w)',
          zIndex:        40,
          flexDirection: 'column',
          padding:       '16px 12px 24px',
          background:    'var(--surface-0)',
          borderRight:   '1px solid var(--border)',
          overflowY:     'auto',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', marginBottom: 20, textDecoration: 'none' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 17,
          }}>N</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>Nia</span>
        </Link>

        {/* Nav links */}
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
                  display:    'flex',
                  alignItems: 'center',
                  gap:        12,
                  padding:    '10px 12px',
                  borderRadius: 14,
                  textDecoration: 'none',
                  fontSize:   15, fontWeight: active ? 700 : 500,
                  transition: 'background 0.15s, color 0.15s',
                  position:   'relative',
                  ...(active ? activeNavItem : { color: 'var(--text-secondary)' }),
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  {showBadge && (
                    <span style={{
                      position: 'absolute', top: -4, right: -4,
                      minWidth: 15, height: 15, borderRadius: 8,
                      background: 'var(--nia-coral)',
                      color: '#fff', fontSize: 9, fontWeight: 800,
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

          {/* Notifications — desktop only */}
          {userId && (
            <Link
              href="/notifications"
              className="tap-sm"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 14,
                textDecoration: 'none',
                fontSize: 15, fontWeight: pathname === '/notifications' ? 700 : 500,
                transition: 'background 0.15s',
                ...(pathname === '/notifications' ? activeNavItem : { color: 'var(--text-secondary)' }),
              }}
            >
              <Bell size={20} strokeWidth={pathname === '/notifications' ? 2.5 : 1.8} />
              <span>Notifications</span>
            </Link>
          )}
        </div>

        {/* Bottom: new post + logout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <Link
            href="/#compose"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'var(--grad-brand)',
              color: '#fff',
              fontWeight: 700, fontSize: 14,
              padding: '12px',
              borderRadius: 14,
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(139,92,246,0.25)',
            }}
            className="tap-sm"
          >
            <Plus size={17} strokeWidth={2.5} />
            New Post
          </Link>
          {userId && <LogoutButton />}
        </div>
      </aside>
    </>
  )
}
