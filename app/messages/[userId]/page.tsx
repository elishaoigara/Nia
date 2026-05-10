'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Send, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s/60)}m`; if (s < 86400) return `${Math.floor(s/3600)}h`
  return `${Math.floor(s/86400)}d`
}

export default function DirectMessagePage() {
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const recipientId = params.userId as string
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [recipient, setRecipient] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('id, username, avatar_url, full_name').eq('id', recipientId).single()
      setRecipient(profile)
      const { data: msgs } = await supabase.from('messages').select('*').or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`).order('created_at', { ascending: true })
      setMessages(msgs ?? [])
      setLoading(false)
      await supabase.from('messages').update({ is_read: true }).eq('recipient_id', user.id).eq('sender_id', recipientId).eq('is_read', false)
      const channel = supabase.channel(`dm-${user.id}-${recipientId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` }, (payload) => {
          const msg = payload.new as any
          if (msg.sender_id === recipientId) { setMessages(prev => [...prev, msg]); supabase.from('messages').update({ is_read: true }).eq('id', msg.id) }
        }).subscribe()
      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [recipientId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage() {
    if (!newMessage.trim() || !currentUserId || sending) return
    setSending(true)
    const optimistic = { id: `temp-${Date.now()}`, sender_id: currentUserId, recipient_id: recipientId, content: newMessage.trim(), is_read: false, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic]); setNewMessage('')
    const { data, error } = await supabase.from('messages').insert({ sender_id: currentUserId, recipient_id: recipientId, content: optimistic.content }).select().single()
    if (!error && data) setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m))
    setSending(false)
  }

  return (
    <div className="flex flex-col" style={{ height: '100dvh', maxWidth: '42rem', margin: '0 auto' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10" style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        {recipient && (
          <Link href={`/profile/${recipient.id}`} className="flex items-center gap-2.5 flex-1">
            <div className="avatar-ring">
              <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--grad-brand)' }}>
                {recipient.avatar_url ? <img src={recipient.avatar_url} className="w-full h-full object-cover" alt="" /> : recipient.username?.[0]?.toUpperCase()}
              </div>
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{recipient.full_name}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{recipient.username}</p>
            </div>
          </Link>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading && <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} /></div>}
        {!loading && messages.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <div className="text-4xl">👋</div>
            <p className="font-bold">Say hi to @{recipient?.username}!</p>
          </div>
        )}
        {messages.map(msg => {
          const isOwn = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm anim-up"
                style={isOwn
                  ? { background: 'var(--grad-brand)', color: '#fff', borderBottomRightRadius: '6px' }
                  : { background: 'var(--surface-2)', color: 'var(--text-primary)', borderBottomLeftRadius: '6px' }
                }
              >
                <p className="leading-relaxed">{msg.content}</p>
                <p className="text-[10px] mt-1 opacity-70">{timeAgo(msg.created_at)}{isOwn && (msg.is_read ? ' ✓✓' : ' ✓')}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 safe-bottom" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-0)' }}>
        <div className="flex gap-2">
          <input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message…"
            className="input flex-1"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="w-11 h-11 flex items-center justify-center rounded-2xl text-white transition-all active:scale-90 disabled:opacity-40"
            style={{ background: 'var(--grad-brand)' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
