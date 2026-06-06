'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, Search, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

type Convo = {
  profile: { id: string; username: string; avatar_url: string | null; full_name: string | null }
  lastMsg: string
  time: string
  unread: boolean
}

export default function MessagesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [convos, setConvos] = useState<Convo[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const [{ data: sent }, { data: received }] = await Promise.all([
        supabase
          .from('messages')
          .select('recipient_id, created_at, content, profiles:recipient_id (id, username, avatar_url, full_name)')
          .eq('sender_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('messages')
          .select('sender_id, created_at, content, is_read, profiles:sender_id (id, username, avatar_url, full_name)')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      const map = new Map<string, Convo>()

      for (const m of sent ?? []) {
        const pid = m.recipient_id
        if (!map.has(pid)) {
          map.set(pid, {
            profile: (m as any).profiles,
            lastMsg: m.content ?? '📎 Media',
            time: m.created_at,
            unread: false,
          })
        }
      }

      for (const m of received ?? []) {
        const pid = m.sender_id
        const existing = map.get(pid)
        if (!existing || new Date(m.created_at) > new Date(existing.time)) {
          map.set(pid, {
            profile: (m as any).profiles,
            lastMsg: m.content ?? '📎 Media',
            time: m.created_at,
            unread: !(m as any).is_read,
          })
        }
      }

      const sorted = Array.from(map.values())
        .filter(c => c.profile)
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

      setConvos(sorted)
      setLoading(false)
    }

    load()

    // Real-time: refresh list when new message arrives
    const channel = supabase
      .channel('messages-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        load()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, []) // eslint-disable-line

  const filtered = query.trim()
    ? convos.filter(c =>
        c.profile.username?.toLowerCase().includes(query.toLowerCase()) ||
        c.profile.full_name?.toLowerCase().includes(query.toLowerCase())
      )
    : convos

  const unreadTotal = convos.filter(c => c.unread).length

  return (
    <main style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--surface-0)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <MessageSquare size={16} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.2, margin: 0 }}>Messages</h1>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
              {unreadTotal > 0 ? `${unreadTotal} unread` : 'Your conversations'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface-2)', borderRadius: 12, padding: '8px 12px',
        }}>
          <Search size={15} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search conversations…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          {query ? (
            <>
              <p style={{ fontWeight: 700, fontSize: 16 }}>No results for "{query}"</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Try a different name</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 44, marginBottom: 10 }}>💬</div>
              <p style={{ fontWeight: 700, fontSize: 17 }}>No messages yet</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4, marginBottom: 20 }}>
                Visit someone's profile and tap <strong>Message</strong> to start a conversation.
              </p>
              <Link
                href="/explore"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px', borderRadius: 20,
                  background: 'var(--grad-brand)', color: 'white',
                  fontWeight: 700, fontSize: 14, textDecoration: 'none',
                }}
              >
                Find people <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      ) : (
        <div>
          {filtered.map(({ profile, lastMsg, time, unread }) => (
            <Link
              key={profile.id}
              href={`/messages/${profile.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                borderBottom: '1px solid var(--divider)',
                background: unread ? 'rgba(91,33,182,0.04)' : 'transparent',
                textDecoration: 'none',
                transition: 'background 0.12s',
              }}
            >
              {/* Avatar with unread ring */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', overflow: 'hidden',
                  background: 'var(--grad-brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: 16,
                  boxShadow: unread ? '0 0 0 2.5px var(--surface-0), 0 0 0 4px var(--nia-violet)' : 'none',
                }}>
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : profile.username?.[0]?.toUpperCase()
                  }
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                  <p style={{
                    fontWeight: unread ? 700 : 600, fontSize: 14,
                    color: 'var(--text-primary)', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {profile.full_name || `@${profile.username}`}
                  </p>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                    {timeAgo(time)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <p style={{
                    fontSize: 13, margin: 0,
                    color: unread ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontWeight: unread ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {lastMsg}
                  </p>
                  {unread && (
                    <div style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: 'var(--nia-violet)', flexShrink: 0,
                    }} />
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}