'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import {
  Send, ArrowLeft, ImagePlus, Mic, Video, File,
  Play, Pause, X, Eye, Reply, Loader2,
  Check, CheckCheck
} from 'lucide-react'
import Link from 'next/link'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

type Message = {
  id: string
  sender_id: string
  recipient_id: string
  content: string | null
  media_url: string | null
  media_type: string | null
  file_name: string | null
  view_once: boolean
  viewed_at: string | null
  reply_to: string | null
  is_read: boolean
  created_at: string
}

export default function DirectMessagePage() {
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const recipientId = params.userId as string

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [recipient, setRecipient] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [viewOnce, setViewOnce] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordDuration, setRecordDuration] = useState(0)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .eq('id', recipientId)
        .single()
      setRecipient(profile)

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
      setMessages((msgs as Message[]) ?? [])
      setLoading(false)

      // Mark messages as read
      await supabase.from('messages')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('sender_id', recipientId)
        .eq('is_read', false)

      const channel = supabase.channel(`dm-${user.id}-${recipientId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        }, (payload) => {
          const msg = payload.new as Message
          if (msg.sender_id === recipientId) {
            setMessages(prev => [...prev, msg])
            supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'messages'
        }, (payload) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m))
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [recipientId, supabase, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function uploadFile(file: File, type: string) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${currentUserId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('message-media').upload(path, file)
    if (error) { setUploading(false); return null }
    const { data } = supabase.storage.from('message-media').getPublicUrl(path)
    setUploading(false)
    return { url: data.publicUrl, name: file.name }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, type: string) {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return
    const result = await uploadFile(file, type)
    if (result) await sendMessage(null, result.url, type, result.name)
    e.target.value = ''
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Fixed: Proper MediaRecorder constructor call
      const MediaRecorderClass = (window as any).MediaRecorder
      const mr = new MediaRecorderClass(stream)

      mrRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = (e: any) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
        const result = await uploadFile(file, 'audio')
        if (result) await sendMessage(null, result.url, 'audio', 'Voice message')
        stream.getTracks().forEach(t => t.stop())
      }

      mr.start()
      setIsRecording(true)
      timerRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000)
    } catch {
      alert('Microphone access denied')
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    mrRef.current?.stop()
    setIsRecording(false)
    setRecordDuration(0)
  }

  async function sendMessage(
    text?: string | null,
    media_url?: string | null,
    media_type?: string | null,
    file_name?: string | null,
  ) {
    if ((!text?.trim() && !media_url) || !currentUserId) return
    setSending(true)

    const payload = {
      sender_id: currentUserId,
      recipient_id: recipientId,
      content: text?.trim() ?? null,
      media_url: media_url ?? null,
      media_type: media_type ?? null,
      file_name: file_name ?? null,
      view_once: viewOnce && !!media_url,
      reply_to: replyTo?.id ?? null,
      is_read: false,
    }

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      ...payload,
      viewed_at: null,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, optimistic])
    setNewMessage('')
    setReplyTo(null)
    setViewOnce(false)

    const { data, error } = await supabase.from('messages').insert(payload).select().single()
    if (!error && data) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data as Message : m))
    }
    setSending(false)
  }

  async function handleViewOnce(msg: Message) {
    if (msg.viewed_at || msg.sender_id === currentUserId) return
    await supabase.from('messages').update({ viewed_at: new Date().toISOString() }).eq('id', msg.id)
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, viewed_at: new Date().toISOString() } : m))
  }

  function toggleAudio(msgId: string, url: string) {
    if (playingAudio === msgId) {
      audioRefs.current[msgId]?.pause()
      setPlayingAudio(null)
    } else {
      if (playingAudio && audioRefs.current[playingAudio]) {
        audioRefs.current[playingAudio].pause()
      }
      if (!audioRefs.current[msgId]) {
        audioRefs.current[msgId] = new Audio(url)
        audioRefs.current[msgId].onended = () => setPlayingAudio(null)
      }
      audioRefs.current[msgId].play()
      setPlayingAudio(msgId)
    }
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  function renderBubble(msg: Message) {
    const isOwn = msg.sender_id === currentUserId
    const replyMsg = messages.find(m => m.id === msg.reply_to)
    const isTemp = msg.id.startsWith('temp-')

    return (
      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group`}>
        <div className="max-w-[78%] space-y-1">
          {/* Reply preview */}
          {msg.reply_to && replyMsg && (
            <div
              className={`text-xs px-3 py-1.5 rounded-xl opacity-70 ${isOwn ? 'ml-auto' : ''}`}
              style={{ background: 'var(--surface-3)', borderLeft: '3px solid var(--nia-violet)', maxWidth: '100%' }}
            >
              <p className="font-bold" style={{ color: 'var(--nia-violet)' }}>
                {replyMsg.sender_id === currentUserId ? 'You' : `@${recipient?.username}`}
              </p>
              <p className="truncate" style={{ color: 'var(--text-secondary)' }}>
                {replyMsg.content ?? replyMsg.file_name ?? 'Media'}
              </p>
            </div>
          )}

          <div className="flex items-end gap-1.5">
            {!isOwn && (
              <button
                onClick={() => setReplyTo(msg)}
                className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-xl flex-shrink-0"
                style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}
              >
                <Reply size={13} />
              </button>
            )}

            <div
              className="rounded-2xl overflow-hidden"
              style={isOwn
                ? { background: 'var(--grad-brand)', color: '#fff', borderBottomRightRadius: '6px' }
                : { background: 'var(--surface-2)', color: 'var(--text-primary)', borderBottomLeftRadius: '6px' }
              }
            >
              {/* Image, Video, Audio, File, Text, and Meta sections remain the same */}
              {msg.media_url && msg.media_type === 'image' && (
                msg.view_once && !isOwn && !msg.viewed_at ? (
                  <button
                    onClick={() => handleViewOnce(msg)}
                    className="flex flex-col items-center gap-2 px-8 py-6"
                    style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.2),rgba(255,107,107,0.2))' }}
                  >
                    <Eye size={28} style={{ color: 'var(--nia-violet)' }} />
                    <span className="text-sm font-bold" style={{ color: 'var(--nia-violet)' }}>Tap to view once</span>
                  </button>
                ) : msg.view_once && !isOwn && msg.viewed_at ? (
                  <div className="px-4 py-3 text-sm opacity-60 flex items-center gap-2">
                    <Eye size={14} /> Viewed
                  </div>
                ) : (
                  <img src={msg.media_url} className="max-w-[260px] max-h-[320px] object-cover" alt="" />
                )
              )}

              {msg.media_url && msg.media_type === 'video' && (
                <video src={msg.media_url} controls className="max-w-[260px] max-h-[320px]" style={{ display: 'block' }} />
              )}

              {msg.media_url && msg.media_type === 'audio' && (
                <div className="flex items-center gap-3 px-4 py-3 min-w-[180px]">
                  <button
                    onClick={() => toggleAudio(msg.id, msg.media_url!)}
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: isOwn ? 'rgba(255,255,255,0.25)' : 'var(--grad-brand)' }}
                  >
                    {playingAudio === msg.id ? <Pause size={14} fill="currentColor" className="text-white" />
                      : <Play size={14} fill="currentColor" className="text-white" />}
                  </button>
                  <div className="flex gap-0.5 items-center flex-1 h-7">
                    {Array.from({ length: 22 }).map((_, i) => (
                      <div key={i} className="flex-1 rounded-full"
                        style={{
                          height: `${10 + Math.sin(i * 0.9) * 8}px`,
                          background: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--nia-violet)',
                          opacity: playingAudio === msg.id ? 1 : 0.5,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-mono opacity-70">🎤</span>
                </div>
              )}

              {msg.media_url && msg.media_type === 'file' && (
                <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 min-w-[180px]"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(168,85,247,0.1)' }}
                  >
                    <File size={18} style={{ color: isOwn ? '#fff' : 'var(--nia-violet)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate max-w-[140px]">{msg.file_name}</p>
                    <p className="text-xs opacity-60">Tap to open</p>
                  </div>
                </a>
              )}

              {msg.content && (
                <p className="px-4 py-2.5 text-[15px] leading-relaxed">{msg.content}</p>
              )}

              <div
                className="flex items-center gap-1 px-4 pb-2"
                style={{ justifyContent: isOwn ? 'flex-end' : 'flex-start' }}
              >
                {msg.view_once && (
                  <Eye size={11} style={{ opacity: 0.6, color: isOwn ? '#fff' : 'var(--nia-violet)' }} />
                )}
                <span style={{ fontSize: '10px', opacity: 0.6 }}>{timeAgo(msg.created_at)}</span>
                {isOwn && (
                  isTemp
                    ? <Check size={12} style={{ opacity: 0.5 }} />
                    : msg.is_read
                      ? <CheckCheck size={12} style={{ color: '#fff' }} />
                      : <Check size={12} style={{ opacity: 0.6 }} />
                )}
              </div>
            </div>

            {isOwn && (
              <button
                onClick={() => setReplyTo(msg)}
                className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-xl flex-shrink-0"
                style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}
              >
                <Reply size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100dvh', maxWidth: '42rem', margin: '0 auto' }}>
      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10 flex-shrink-0"
        style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--border)' }}
      >
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={18} />
        </button>

        {recipient && (
          <Link href={`/profile/${recipient.id}`} className="flex items-center gap-2.5 flex-1">
            <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'var(--grad-brand)' }}
            >
              {recipient.avatar_url
                ? <img src={recipient.avatar_url} className="w-full h-full object-cover" alt="" />
                : recipient.username?.[0]?.toUpperCase()
              }
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{recipient.full_name}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{recipient.username}</p>
            </div>
          </Link>
        )}
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center py-20 space-y-3">
            <div className="text-5xl">👋</div>
            <p className="font-bold text-lg">Say hi to @{recipient?.username}!</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Start a conversation</p>
          </div>
        )}
        {messages.map(msg => renderBubble(msg))}
        <div ref={bottomRef} />
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
          style={{ background: 'var(--surface-1)', borderTop: '1px solid var(--border)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold" style={{ color: 'var(--nia-violet)' }}>
              Replying to {replyTo.sender_id === currentUserId ? 'yourself' : `@${recipient?.username}`}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              {replyTo.content ?? replyTo.file_name ?? 'Media'}
            </p>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ color: 'var(--text-tertiary)' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="px-3 py-3 flex-shrink-0 safe-bottom"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-0)' }}
      >
        {isRecording ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.3)' }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-sm font-mono font-bold text-red-500 flex-1">{fmt(recordDuration)}</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Recording…</span>
            <button onClick={stopRecording}
              className="px-4 py-2 rounded-xl text-white text-sm font-bold"
              style={{ background: '#ef4444' }}
            >
              Send
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex gap-1 pb-0.5">
              <button onClick={() => fileRef.current?.click()}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                title="Image"
              >
                <ImagePlus size={17} />
              </button>
              <button onClick={() => videoRef.current?.click()}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                title="Video"
              >
                <Video size={17} />
              </button>
              <button onClick={startRecording}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                title="Voice"
              >
                <Mic size={17} />
              </button>
            </div>

            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl"
              style={{ background: 'var(--surface-2)' }}
            >
              <input
                ref={inputRef}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(newMessage)}
                placeholder="Message…"
                className="flex-1 bg-transparent text-[15px] focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              <button
                onClick={() => setViewOnce(!viewOnce)}
                title="View once"
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                style={viewOnce
                  ? { background: 'rgba(168,85,247,0.15)', color: 'var(--nia-violet)' }
                  : { color: 'var(--text-tertiary)' }
                }
              >
                <Eye size={15} />
              </button>
            </div>

            <button
              onClick={() => sendMessage(newMessage)}
              disabled={!newMessage.trim() || sending || uploading}
              className="w-10 h-10 flex items-center justify-center rounded-2xl text-white transition-all active:scale-90 disabled:opacity-40 flex-shrink-0"
              style={{ background: 'var(--grad-brand)' }}
            >
              {sending || uploading
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={16} />
              }
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => handleFileSelect(e, 'image')} />
        <input ref={videoRef} type="file" accept="video/*" className="hidden"
          onChange={e => handleFileSelect(e, 'video')} />
      </div>
    </div>
  )
}