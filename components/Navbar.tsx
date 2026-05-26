'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Compass, Users, User, Search, Bell, Plus,
  Clapperboard, MessageSquare,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'
import LogoutButton from '@/components/LogoutButton'
import { createClient } from '@/lib/supabase/client'

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
  const pathname = usePathname() ?? ''
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
      if (!user?.id) return

      const fetchUnreadCount = async () => {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('is_read', false)
        
        setUnreadMessages(count ?? 0)
      }

      fetchUnreadCount()

      const channel = supabase
        .channel('nav-msgs')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
          () => setUnreadMessages(prev => prev + 1)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
          () => fetchUnreadCount()
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    })
  }, [supabase])

  const isDmPage = pathname.startsWith('/messages/') && pathname.split('/').length === 3

  if (pathname === '/flicks') return null

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    if (href === '/messages') return pathname.startsWith('/messages')
    if (href === '/profile') return pathname.startsWith('/profile')
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Top Header Navbar ───────────────────────────── */}
      {!isDmPage && (
        <header
          className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:left-60 bg-(--surface-0) border-b backdrop-blur-md"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Logo — shown on mobile only */}
          <Link href="/" className="flex items-center gap-2 select-none sm:invisible" aria-label="Nia home">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-base bg-(--grad-brand)">
              N
            </div>
            <span className="font-extrabold text-lg tracking-tight text-(--text-primary)">Nia</span>
          </Link>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {userId && <NotificationBell userId={userId} />}
            {userId && <LogoutButton variant="icon" />}
            <Link
              href="/#compose"
              className="tap-sm flex items-center gap-1.5 text-white text-sm font-bold px-3.5 py-2 rounded-xl transition-all active:scale-95 min-h-9 bg-(--grad-brand) shadow-[0_4px_14px_rgba(168,85,247,0.3)]"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden xs:inline">Post</span>
            </Link>
          </div>
        </header>
      )}

      {/* ── Mobile Base Bottom Tab Navigation ────────────── */}
      {!isDmPage && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around sm:hidden border-t bg-(--surface-0) h-(--nav-bottom)"
          style={{
            borderColor: 'var(--border)',
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
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-h-12 select-none tap-xs"
              >
                <div
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200"
                  style={active ? { background: 'linear-gradient(135deg, rgba(255,107,107,0.15), rgba(168,85,247,0.15))' } : {}}
                >
                  <Icon 
                    size={20} 
                    strokeWidth={active ? 2.5 : 1.8} 
                    style={{ color: active ? 'var(--nia-violet)' : 'var(--text-tertiary)' }} 
                  />
                  
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 flex items-center justify-center text-white text-[9px] font-black rounded-full px-1 bg-(--nia-coral) shadow-sm">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </div>
                <span 
                  className="text-[9px] font-bold" 
                  style={{ color: active ? 'var(--nia-violet)' : 'var(--text-tertiary)' }}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </nav>
      )}

      {/* ── Desktop Anchor Sidebar ──────────────────────── */}
      <aside
        className="hidden sm:flex fixed left-0 top-0 h-full flex-col px-3 pt-4 pb-6 border-r bg-(--surface-0) w-60 z-40 select-none"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 px-3 mb-6 mt-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg bg-(--grad-brand)">
            N
          </div>
          <span className="font-extrabold text-xl tracking-tight text-(--text-primary)">Nia</span>
        </Link>

        <div className="flex-1 space-y-0.5 overflow-y-auto hidden-scrollbar">
          {LINKS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            const showBadge = href === '/messages' && unreadMessages > 0
            
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[15px] font-bold transition-all duration-150 relative tap-sm"
                style={active
                  ? { background: 'linear-gradient(135deg, rgba(255,107,107,0.12), rgba(168,85,247,0.12))', color: 'var(--nia-violet)' }
                  : { color: 'var(--text-secondary)' }}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-4.5 h-4.5 flex items-center justify-center text-white text-[9px] font-black rounded-full px-1 bg-(--nia-coral) shadow-sm">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </div>
                <span>{label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-(--nia-violet)" />}
              </Link>
            )
          })}

          {userId && (
            <Link
              href="/notifications"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[15px] font-bold transition-all duration-150 tap-sm"
              style={pathname === '/notifications'
                ? { background: 'linear-gradient(135deg, rgba(255,107,107,0.12), rgba(168,85,247,0.12))', color: 'var(--nia-violet)' }
                : { color: 'var(--text-secondary)' }}
            >
              <Bell size={20} strokeWidth={pathname === '/notifications' ? 2.5 : 1.8} />
              <span>Notifications</span>
            </Link>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <Link 
            href="/#compose" 
            className="flex items-center justify-center gap-2 w-full text-white text-sm font-bold py-3 rounded-xl transition-all duration-150 tap-sm active:scale-95 bg-(--grad-brand) shadow-[0_4px_14px_rgba(168,85,247,0.25)]"
          >
            <Plus size={18} strokeWidth={2.5} /> 
            <span>New Post</span>
          </Link>
          {userId && <LogoutButton />}
        </div>
      </aside>
    </>
  )
}
