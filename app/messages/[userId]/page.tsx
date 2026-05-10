'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Send, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  is_read: boolean
  created_at: string
}

interface Profile {
  id: string
  username: string
  avatar_url: string | null
  full_name: string
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export default function DirectMessagePage() {
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const recipientId = params.userId as string

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [recipient, setRecipient] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      // Load recipient profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .eq('id', recipientId)
        .single()
      setRecipient(profile)

      // Load message history
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })
      setMessages(msgs ?? [])
      setLoading(false)

      // Mark incoming messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('sender_id', recipientId)
        .eq('is_read', false)

      // Realtime subscription
      const channel = supabase
        .channel(`dm-${user.id}-${recipientId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            const msg = payload.new as Message
            if (msg.sender_id === recipientId) {
              setMessages((prev) => [...prev, msg])
              // Mark as read immediately
              supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', msg.id)
            }
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }

    init()
  }, [recipientId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!newMessage.trim() || !currentUserId || sending) return
    setSending(true)

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      recipient_id: recipientId,
      content: newMessage.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setNewMessage('')

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUserId,
        recipient_id: recipientId,
        content: optimistic.content,
      })
      .select()
      .single()

    if (!error && data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? data : m))
      )
    }

    setSending(false)
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={18} />
        </button>
        {recipient && (
          <>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
              {recipient.avatar_url
                ? <img src={recipient.avatar_url} className="w-9 h-9 object-cover" alt="" />
                : recipient.username?.[0]?.toUpperCase() ?? '?'
              }
            </div>
            <div>
              <p className="font-semibold text-sm">{recipient.full_name}</p>
              <p className="text-xs text-zinc-400">@{recipient.username}</p>
            </div>
          </>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-zinc-400" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-16 text-zinc-400">
            <p className="text-sm">No messages yet.</p>
            <p className="text-sm mt-1">Say hi to @{recipient?.username}!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isOwn
                    ? 'bg-purple-600 text-white rounded-br-md'
                    : 'bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-bl-md'
                }`}
              >
                <p className="leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-purple-200' : 'text-zinc-400'}`}>
                  {timeAgo(msg.created_at)}
                  {isOwn && <span className="ml-1">{msg.is_read ? '✓✓' : '✓'}</span>}
                </p>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="flex gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message…"
            className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-2xl transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
