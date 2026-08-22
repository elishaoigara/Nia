'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, Search, ArrowRight, Loader2, Inbox } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { BlockRow, ConversationMessageRow, MessageRequestRow } from '@/types/domain'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

type CircleContext = { name: string; slug: string; category: string | null }

type Convo = {
  profile: { id: string; username: string; avatar_url: string | null; full_name?: string | null }
  lastMsg: string
  time: string
  unread: boolean
  isRequest: boolean
  circleContext?: CircleContext
}

export default function MessagesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [convos, setConvos] = useState<Convo[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'primary' | 'requests'>('primary')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const [{ data: sent }, { data: received }, { data: blocks }, { data: requests }] = await Promise.all([
        supabase.from('messages')
          .select('recipient_id, created_at, content, profiles:recipient_id (id, username, avatar_url, full_name)')
          .eq('sender_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('messages')
          .select('sender_id, created_at, content, is_read, profiles:sender_id (id, username, avatar_url, full_name)')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id),
        supabase.from('message_requests').select('other_id, status').eq('user_id', user.id),
      ])

      const blockedIds = new Set(((blocks ?? []) as BlockRow[]).map(block => block.blocked_id))
      const requestStatus = new Map<string, string>(
        ((requests ?? []) as MessageRequestRow[]).map(request => [request.other_id, request.status]),
      )
      const sentRows = (sent ?? []) as unknown as ConversationMessageRow[]
      const receivedRows = (received ?? []) as unknown as ConversationMessageRow[]

      const map = new Map<string, Convo>()

      for (const m of sentRows) {
        const pid = m.recipient_id
        if (blockedIds.has(pid)) continue
        if (!map.has(pid)) {
          map.set(pid, {
            profile: m.profiles,
            lastMsg: m.content ?? '📎 Media',
            time: m.created_at,
            unread: false,
            isRequest: false, // I messaged them — never a "request" for me
          })
        }
      }

      for (const m of receivedRows) {
        const pid = m.sender_id
        if (blockedIds.has(pid)) continue
        const status = requestStatus.get(pid)
        if (status === 'declined') continue
        const existing = map.get(pid)
        const isRequest = status === 'pending'
        if (!existing || new Date(m.created_at) > new Date(existing.time)) {
          map.set(pid, {
            profile: m.profiles,
            lastMsg: m.content ?? '📎 Media',
            time: m.created_at,
            unread: !m.is_read,
            isRequest: existing ? existing.isRequest && isRequest : isRequest,
          })
        }
      }

      const sorted = Array.from(map.values())
        .filter(c => c.profile)
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

      // Show only a verified shared Circle; do not infer context from profile data.
      const otherIds = sorted.map(convo => convo.profile.id)
      if (otherIds.length > 0) {
        const { data: sharedMembers } = await supabase
          .from('circle_members')
          .select('circle_id, user_id')
          .in('user_id', [user.id, ...otherIds])
        const circleIds = Array.from(new Set((sharedMembers ?? []).map(row => row.circle_id)))
        if (circleIds.length > 0) {
          const { data: sharedCircles } = await supabase
            .from('circles')
            .select('id, name, slug, category')
            .in('id', circleIds)
          const memberSets = new Map<string, Set<string>>()
          for (const row of sharedMembers ?? []) {
            const set = memberSets.get(row.circle_id) ?? new Set<string>()
            set.add(row.user_id)
            memberSets.set(row.circle_id, set)
          }
          const circleById = new Map((sharedCircles ?? []).map(circle => [circle.id, circle]))
          for (const convo of sorted) {
            const match = circleIds.find(circleId => memberSets.get(circleId)?.has(user.id) && memberSets.get(circleId)?.has(convo.profile.id))
            const circle = match ? circleById.get(match) : null
            if (circle) convo.circleContext = { name: circle.name, slug: circle.slug, category: circle.category }
          }
        }
      }

      setConvos(sorted)
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel('messages-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'message_requests' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [router, supabase])

  async function accept(otherId: string) {
    if (!currentUserId) return
    setBusyId(otherId)
    await supabase.from('message_requests').update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('user_id', currentUserId).eq('other_id', otherId)
    setConvos(prev => prev.map(c => (c.profile.id === otherId ? { ...c, isRequest: false } : c)))
    setBusyId(null)
  }

  async function decline(otherId: string) {
    if (!currentUserId) return
    setBusyId(otherId)
    await supabase.from('message_requests').update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('user_id', currentUserId).eq('other_id', otherId)
    setConvos(prev => prev.filter(c => c.profile.id !== otherId))
    setBusyId(null)
  }

  const { primary, requests } = useMemo(() => {
    const primary = convos.filter(c => !c.isRequest)
    const requests = convos.filter(c => c.isRequest)
    return { primary, requests }
  }, [convos])

  const activeList = tab === 'primary' ? primary : requests

  const filtered = query.trim()
    ? activeList.filter(c =>
        c.profile.username?.toLowerCase().includes(query.toLowerCase()) ||
        c.profile.full_name?.toLowerCase().includes(query.toLowerCase())
      )
    : activeList

  const unreadTotal = primary.filter(c => c.unread).length

  return (
    <main style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MessageSquare size={16} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.2, margin: 0 }}>Conversations</h1>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
              {unreadTotal > 0 ? `${unreadTotal} waiting for you` : 'Keep the good conversations close.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', borderRadius: 12, padding: '8px 12px', marginBottom: 12 }}>
          <Search size={15} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search people or conversations…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit' }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['primary', 'requests'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="tap-sm"
              style={{
                flex: 1, padding: '10px 0', border: 'none', background: 'transparent',
                fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                color: tab === t ? 'var(--nia-violet)' : 'var(--text-tertiary)',
                borderBottom: tab === t ? '2px solid var(--nia-violet)' : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {t === 'primary' ? 'Conversations' : 'New people'}
              {t === 'requests' && requests.length > 0 && (
                <span style={{ background: 'var(--nia-violet)', color: 'white', borderRadius: 10, fontSize: 10.5, fontWeight: 800, padding: '1px 6px' }}>
                  {requests.length}
                </span>
              )}
            </button>
          ))}
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
              <p style={{ fontWeight: 700, fontSize: 16 }}>No results for “{query}”</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Try a different name</p>
            </>
          ) : tab === 'requests' ? (
            <>
              <Inbox size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 10 }} />
              <p style={{ fontWeight: 700, fontSize: 16 }}>No message requests</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>DMs from people you don’t follow will land here.</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 44, marginBottom: 10 }}>💬</div>
              <p style={{ fontWeight: 700, fontSize: 17 }}>No messages yet</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4, marginBottom: 20 }}>
                Visit someone’s profile and tap <strong>Message</strong> to start a conversation.
              </p>
              <Link href="/explore" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 20, background: 'var(--grad-brand)', color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                Find people <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      ) : (
        <div>
          {filtered.length > 0 && <p className="messages-section-label">{tab === 'primary' ? 'Keeping the thread warm' : 'New people to meet'}</p>}
          {tab === 'requests' && requests.length > 0 && <p className="messages-safety-note">Only accept conversations you welcome. You can block or report at any time.</p>}
          {filtered.map(({ profile, lastMsg, time, unread, isRequest, circleContext }) => (
            <div key={profile.id} style={{ borderBottom: '1px solid var(--divider)' }}>
              <Link
                href={`/messages/${profile.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: unread ? 'rgba(91,33,182,0.04)' : 'transparent', textDecoration: 'none', transition: 'background 0.12s' }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16, boxShadow: unread ? '0 0 0 2.5px var(--surface-0), 0 0 0 4px var(--nia-violet)' : 'none' }}>
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : profile.username?.[0]?.toUpperCase()}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                    <p style={{ fontWeight: unread ? 700 : 600, fontSize: 14, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {profile.full_name || `@${profile.username}`}
                    </p>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>{timeAgo(time)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div className="messages-preview-line">
                      <p style={{ fontSize: 13, margin: 0, color: unread ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lastMsg}
                      </p>
                      {circleContext && <span className="message-circle-badge" title={`Shared Circle: ${circleContext.name}`}>{circleContext.name}</span>}
                    </div>
                    {unread && <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--nia-violet)', flexShrink: 0 }} />}
                  </div>
                </div>
              </Link>

              {isRequest && tab === 'requests' && (
                <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px 76px' }}>
                  <button
                    onClick={() => accept(profile.id)}
                    disabled={busyId === profile.id}
                    className="tap-sm"
                    style={{ flex: 1, padding: '7px', borderRadius: 10, border: 'none', background: 'var(--grad-brand)', color: 'white', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
                  >
                    Say hello
                  </button>
                  <button
                    onClick={() => decline(profile.id)}
                    disabled={busyId === profile.id}
                    className="tap-sm"
                    style={{ flex: 1, padding: '7px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
                  >
                    Not now
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}