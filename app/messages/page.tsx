'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, CheckCheck, MessageCircle, PenSquare, Search, Settings2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { mediaUrl } from '@/lib/media-url'
import { conversationTime } from '@/lib/message-format'
import './messages.css'

type Profile = { id: string; username: string; full_name?: string | null; avatar_url: string | null }
type Conversation = { other_id: string; content: string | null; created_at: string; is_read: boolean; sender_id: string; profile?: Profile; request: boolean }
type Filter = 'all' | 'unread' | 'requests'

export default function Messages() {
  const [rows, setRows] = useState<Conversation[]>([])
  const [viewer, setViewer] = useState('')
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Filter>('all')
  const [responding, setResponding] = useState<string | null>(null)
  const cursor = useRef<{ time: string; id: string } | null>(null)
  const generation = useRef(0)
  const pending = useRef(false)

  const load = useCallback(async (reset = false) => {
    if (pending.current && !reset) return
    const version = ++generation.current
    pending.current = true; setBusy(true); setError('')
    try {
      const s = createClient(), { data: { user } } = await s.auth.getUser()
      if (!user) throw Error('Sign in again.')
      const before = reset ? null : cursor.current
      const [conversations, requests] = await Promise.all([
        s.rpc('conversation_page', { before_time: before?.time ?? null, before_user: before?.id ?? null, page_size: 20 }),
        s.from('message_requests').select('other_id,status').eq('user_id', user.id),
      ])
      if (conversations.error || requests.error) throw conversations.error || requests.error
      const data = conversations.data ?? []
      const ids = data.map(row => row.other_id)
      const profiles = ids.length ? await s.from('profiles').select('id,username,full_name,avatar_url').in('id', ids) : { data: [], error: null }
      if (profiles.error) throw profiles.error
      const cards = new Map<string, Profile>((profiles.data ?? []).map(p => [p.id, p]))
      // Private accounts may expose only a safe profile card through this RPC.
      await Promise.all(ids.filter(id => !cards.has(id)).map(async id => {
        const { data } = await s.rpc('profile_card', { target_user: id })
        if (data?.[0]) cards.set(id, data[0])
      }))
      if (version !== generation.current) return
      const status = new Map((requests.data ?? []).map(r => [r.other_id, r.status]))
      const incoming = data.filter(r => status.get(r.other_id) !== 'declined').map(r => ({ ...r, profile: cards.get(r.other_id), request: status.get(r.other_id) === 'pending' }))
      setViewer(user.id)
      setRows(old => reset ? incoming : [...old, ...incoming.filter(r => !old.some(o => o.other_id === r.other_id))])
      setMore(data.length === 20)
      const last = data.at(-1)
      cursor.current = last ? { time: last.created_at, id: last.other_id } : null
    } catch { if (version === generation.current) setError('Couldn’t load your chats. Try again.') }
    finally { if (version === generation.current) { setBusy(false); pending.current = false } }
  }, [])

  useEffect(() => {
    let disposed = false
    let refresh: ReturnType<typeof setTimeout>
    const s = createClient()
    let channel: ReturnType<typeof s.channel> | undefined
    void s.auth.getUser().then(({ data: { user } }) => {
      if (disposed) return
      void load(true)
      if (!user) return
      const reload = () => { clearTimeout(refresh); refresh = setTimeout(() => void load(true), 150) }
      channel = s.channel(`inbox-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` }, reload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` }, reload).subscribe()
    })
    // The mutable counter invalidates whichever request is active at unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { disposed = true; generation.current++; pending.current = false; clearTimeout(refresh); if (channel) void s.removeChannel(channel) }
  }, [load])

  async function respond(other: string, accept: boolean) {
    if (responding) return
    setResponding(other)
    try {
      const { error } = await createClient().from('message_requests').update({ status: accept ? 'accepted' : 'declined' }).match({ user_id: viewer, other_id: other })
      if (error) throw error
      await load(true)
    } catch { setError('Couldn’t update this request. Try again.') }
    finally { setResponding(null) }
  }

  const unread = (row: Conversation) => !row.is_read && row.sender_id !== viewer
  const query = search.trim().toLowerCase()
  const visible = rows.filter(r => (tab === 'all' || (tab === 'unread' ? unread(r) : r.request)) && `${r.profile?.full_name ?? ''} ${r.profile?.username ?? ''} ${r.content ?? ''}`.toLowerCase().includes(query))
  const unreadCount = rows.filter(unread).length
  return <main className="messenger-inbox">
    <header className="messenger-heading"><div><span className="messenger-kicker">YOUR INBOX</span><h1>Messages<span>{unreadCount > 0 ? unreadCount : ''}</span></h1><p>A little closer, one conversation at a time.</p></div>
      <Link className="messenger-compose" href="/explore?type=people" aria-label="Start a new conversation"><PenSquare size={22} /></Link></header>
    <div className="messenger-search-row"><label className="messenger-search"><Search size={19} /><input aria-label="Search loaded conversations" placeholder="Search people or messages" value={search} onChange={e => setSearch(e.target.value)} /></label><Link className="messenger-settings" href="/settings" aria-label="Messaging privacy settings"><Settings2 size={20} /></Link></div>
    <nav className="messenger-filters" aria-label="Message filters">{(['all', 'unread', 'requests'] as const).map(filter => <button key={filter} aria-pressed={tab === filter} onClick={() => setTab(filter)}>{filter === 'all' ? 'All chats' : filter === 'unread' ? 'Unread' : 'Requests'}{filter === 'requests' && rows.some(r => r.request) && <span>{rows.filter(r => r.request).length}</span>}</button>)}</nav>
    <div className="messenger-list-label"><span>{tab === 'requests' ? 'MESSAGE REQUESTS' : 'CONVERSATIONS'}</span><span>{visible.length}</span></div>
    <div className="messenger-list" aria-busy={busy}>
      {visible.map(row => { const isUnread = unread(row); return <article key={row.other_id} className={`inbox-conversation messenger-conversation ${isUnread ? 'is-unread' : ''}`}>
        <Link href={`/messages/${row.other_id}`} aria-label={`Chat with ${row.profile?.full_name || row.profile?.username || 'Nia member'}${isUnread ? ', unread message' : ''}`}>
          <span className="messenger-avatar">{row.profile?.avatar_url ? <img src={mediaUrl(row.profile.avatar_url)} alt="" loading="lazy" decoding="async" /> : (row.profile?.username || 'N').slice(0, 1).toUpperCase()}</span>
          <div className="messenger-conversation-copy"><div className="messenger-name-line"><strong>{row.profile?.full_name || row.profile?.username || 'Nia member'}</strong><time dateTime={row.created_at} title={new Date(row.created_at).toLocaleString()}>{conversationTime(row.created_at)}</time></div>
            <div className="messenger-preview"><p>{row.sender_id === viewer && <CheckCheck size={14} aria-label={row.is_read ? 'Read' : 'Sent'} />}{row.sender_id === viewer ? 'You: ' : ''}{row.content || 'Sent an attachment'}</p>{isUnread && <span className="messenger-unread-dot" />}</div>{row.request && <span className="messenger-request-label">Wants to connect</span>}
          </div>
        </Link>
        {row.request && <div className="messenger-request-actions"><button disabled={responding !== null} onClick={() => void respond(row.other_id, true)}>Accept</button><button disabled={responding !== null} onClick={() => void respond(row.other_id, false)}>Decline</button></div>}
      </article> })}
      {busy && !rows.length && <div role="status" aria-label="Loading conversations">{[0, 1, 2, 3].map(n => <div className="messenger-skeleton" key={n}><span /><div><i /><i /></div></div>)}</div>}
      {!busy && !visible.length && !error && <div className="messenger-empty"><MessageCircle size={32} /><h2>{query ? 'No matching chats' : tab === 'unread' ? 'You’re all caught up' : tab === 'requests' ? 'No requests right now' : 'Good conversations start here'}</h2><p>{query ? 'Try another name or load more conversations.' : 'Find your people and say hello.'}</p>{!query && tab === 'all' && <Link href="/explore?type=people">Find people <ArrowUpRight size={16} /></Link>}</div>}
    </div>
    {error && <p className="messenger-error" role="alert">{error}</p>}
    {(more || error) && <button className="messenger-load" disabled={busy} onClick={() => void load(Boolean(error))}>{busy ? 'Loading…' : error ? 'Retry' : 'Load more chats'}</button>}
  </main>
}
