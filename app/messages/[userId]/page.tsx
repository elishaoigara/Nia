'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import {
  Send, ArrowLeft, ImagePlus, Mic, Video,
  File as FileIcon, Play, Pause, X, Eye,
  Reply, Loader2, Check, CheckCheck,
} from 'lucide-react'
import Link from 'next/link'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
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

type Profile = { id: string; username: string; avatar_url: string | null; full_name: string | null }

export default function DirectMessagePage() {
  const supabase = createClient()
  const { userId } = useParams() as { userId?: string }
  const router = useRouter()

  if (!userId) return <div style={{ textAlign: 'center', padding: 32 }}>Invalid conversation</div>

  const recipientId = userId
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [recipient, setRecipient] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordDuration, setRecordDuration] = useState(0)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [revealedMedia, setRevealedMedia] = useState<Set<string>>(new Set())

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      Object.values(audioRefs.current).forEach(a => { a.pause(); a.src = '' })
    }
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const [{ data: profile }, { data: msgs }] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url, full_name').eq('id', recipientId).single(),
        supabase.from('messages').select('*')
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: true }),
      ])

      setRecipient(profile as Profile)
      setMessages((msgs as Message[]) ?? [])
      setLoading(false)

      // Mark received messages as read
      await supabase.from('messages').update({ is_read: true })
        .eq('recipient_id', user.id).eq('sender_id', recipientId).eq('is_read', false)

      // Real-time subscription
      const channel = supabase.channel(`dm-${user.id}-${recipientId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` }, payload => {
          const msg = payload.new as Message
          if (msg.sender_id === recipientId) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === msg.id)) return prev
              return [...prev, msg]
            })
            supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? (payload.new as Message) : m))
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [recipientId, router]) // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function uploadFile(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${currentUserId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('message-media').upload(path, file)
    if (error) {
      setUploading(false)
      alert(`Upload failed: ${error.message}`)
      return null
    }
    const { data } = supabase.storage.from('message-media').getPublicUrl(path)
    setUploading(false)
    return { url: data.publicUrl, name: file.name }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, type: string) {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return
    const detectedType = file.type === 'image/gif' ? 'gif' : type
    const result = await uploadFile(file)
    if (result) await sendMessage(null, result.url, detectedType, result.name)
    e.target.value = ''
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mrRef.current = mr; chunksRef.current = []
      mr.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
        const result = await uploadFile(file)
        if (result) await sendMessage(null, result.url, 'audio', 'Voice message')
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start(); setIsRecording(true)
      timerRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000)
    } catch { alert('Microphone access denied') }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    mrRef.current?.stop(); setIsRecording(false); setRecordDuration(0)
  }

  function cancelRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    mrRef.current?.stream?.getTracks().forEach(t => t.stop())
    mrRef.current = null; chunksRef.current = []
    setIsRecording(false); setRecordDuration(0)
  }

  async function sendMessage(
    text?: string | null, media_url?: string | null,
    media_type?: string | null, file_name?: string | null,
  ) {
    if ((!text?.trim() && !media_url) || !currentUserId) return
    setSending(true)
    const payload = {
      sender_id: currentUserId, recipient_id: recipientId,
      content: text?.trim() ?? null, media_url: media_url ?? null,
      media_type: media_type ?? null, file_name: file_name ?? null,
      view_once: false, reply_to: replyTo?.id ?? null, is_read: false,
    }
    // Optimistic
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = { id: tempId, ...payload, viewed_at: null, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    setNewMessage(''); setReplyTo(null)

    const { data, error } = await supabase.from('messages').insert(payload).select().single()
    if (!error && data) {
      // Replace optimistic with real
      setMessages(prev => prev.map(m => m.id === tempId ? (data as Message) : m))
    } else if (error) {
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== tempId))
    }
    setSending(false)
  }

  function toggleAudio(msgId: string, url: string) {
    if (playingAudio === msgId) {
      audioRefs.current[msgId]?.pause()
      setPlayingAudio(null)
      return
    }
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

  function renderBubble(msg: Message) {
    const isOwn = msg.sender_id === currentUserId
    const replyMsg = messages.find(m => m.id === msg.reply_to)
    const isTemp = msg.id.startsWith('temp-')
    const isViewOnceRevealed = revealedMedia.has(msg.id)

    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          justifyContent: isOwn ? 'flex-end' : 'flex-start',
          marginBottom: 6,
          alignItems: 'flex-end',
          gap: 6,
        }}
        className="group"
      >
        {/* Recipient avatar */}
        {!isOwn && (
          <Link href={`/profile/${recipient?.id}`} style={{ flexShrink: 0, marginBottom: 2 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--grad-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 10,
            }}>
              {recipient?.avatar_url
                ? <img src={recipient.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : recipient?.username?.[0]?.toUpperCase()
              }
            </div>
          </Link>
        )}

        <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
          {/* Reply preview */}
          {msg.reply_to && replyMsg && (
            <div style={{
              fontSize: 12, padding: '6px 10px', borderRadius: 10,
              background: 'var(--surface-3)',
              borderLeft: '3px solid var(--nia-violet)',
              maxWidth: '100%', opacity: 0.75,
            }}>
              <p style={{ fontWeight: 700, color: 'var(--nia-violet)', margin: '0 0 2px' }}>
                {replyMsg.sender_id === currentUserId ? 'You' : `@${recipient?.username}`}
              </p>
              <p style={{ color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {replyMsg.content ?? replyMsg.file_name ?? 'Media'}
              </p>
            </div>
          )}

          {/* Bubble */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            {/* Reply button — shown on hover for received */}
            {!isOwn && (
              <button
                onClick={() => setReplyTo(msg)}
                className="opacity-0 group-hover:opacity-100 tap-sm"
                style={{
                  width: 28, height: 28, borderRadius: 8, border: 'none',
                  background: 'var(--surface-2)', color: 'var(--text-tertiary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'opacity 0.15s',
                  flexShrink: 0,
                }}
              >
                <Reply size={13} />
              </button>
            )}

            <div
              style={{
                borderRadius: 18,
                overflow: 'hidden',
                ...(isOwn
                  ? { background: 'var(--grad-brand)', color: '#fff', borderBottomRightRadius: 5 }
                  : { background: 'var(--surface-2)', color: 'var(--text-primary)', borderBottomLeftRadius: 5 }
                ),
              }}
            >
              {/* Image */}
              {msg.media_url && (msg.media_type === 'image' || msg.media_type === 'gif') && (
                msg.view_once && !isViewOnceRevealed ? (
                  <button
                    onClick={() => setRevealedMedia(prev => new Set([...prev, msg.id]))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '12px 16px', border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      color: isOwn ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)',
                    }}
                  >
                    <Eye size={16} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Tap to view · disappears after</span>
                  </button>
                ) : (
                  <img
                    src={msg.media_url} alt=""
                    style={{ display: 'block', width: '100%', maxHeight: 300, objectFit: 'cover', maxWidth: 260 }}
                  />
                )
              )}

              {/* Video */}
              {msg.media_url && msg.media_type === 'video' && (
                <video src={msg.media_url} controls style={{ display: 'block', width: '100%', maxHeight: 300, maxWidth: 260 }} />
              )}

              {/* Audio */}
              {msg.media_url && msg.media_type === 'audio' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', minWidth: 160 }}>
                  <button
                    onClick={() => toggleAudio(msg.id, msg.media_url!)}
                    style={{
                      width: 34, height: 34, borderRadius: '50%', border: 'none',
                      cursor: 'pointer', flexShrink: 0,
                      background: isOwn ? 'rgba(255,255,255,0.25)' : 'var(--grad-brand)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {playingAudio === msg.id
                      ? <Pause size={14} color="white" />
                      : <Play size={14} color="white" style={{ marginLeft: 2 }} />
                    }
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      height: 3, borderRadius: 2,
                      background: isOwn ? 'rgba(255,255,255,0.3)' : 'var(--surface-3)',
                      marginBottom: 4,
                    }} />
                    <span style={{ fontSize: 11, opacity: 0.65 }}>Voice message</span>
                  </div>
                </div>
              )}

              {/* File */}
              {msg.media_url && msg.media_type === 'file' && (
                <a
                  href={msg.media_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', textDecoration: 'none', minWidth: 160 }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(91,33,182,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FileIcon size={17} color={isOwn ? '#fff' : 'var(--nia-violet)'} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                      {msg.file_name}
                    </p>
                    <p style={{ fontSize: 11, opacity: 0.55, margin: 0 }}>Tap to open</p>
                  </div>
                </a>
              )}

              {/* Text */}
              {msg.content && (
                <p style={{ padding: '9px 14px', fontSize: 14, lineHeight: 1.55, margin: 0 }}>{msg.content}</p>
              )}

              {/* Meta row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 12px 8px',
                justifyContent: isOwn ? 'flex-end' : 'flex-start',
              }}>
                {msg.view_once && <Eye size={10} style={{ opacity: 0.5 }} />}
                <span style={{ fontSize: 10, opacity: 0.55 }}>{timeAgo(msg.created_at)}</span>
                {isOwn && (
                  isTemp
                    ? <Check size={11} style={{ opacity: 0.4 }} />
                    : msg.is_read
                      ? <CheckCheck size={11} color={isOwn ? 'rgba(255,255,255,0.8)' : 'var(--nia-violet)'} />
                      : <Check size={11} style={{ opacity: 0.55 }} />
                )}
              </div>
            </div>

            {/* Reply button for own messages */}
            {isOwn && (
              <button
                onClick={() => setReplyTo(msg)}
                className="opacity-0 group-hover:opacity-100 tap-sm"
                style={{
                  width: 28, height: 28, borderRadius: 8, border: 'none',
                  background: 'var(--surface-2)', color: 'var(--text-tertiary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'opacity 0.15s',
                  flexShrink: 0,
                }}
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
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100dvh - var(--nav-top))',
      maxWidth: '42rem', width: '100%', margin: '0 auto',
    }}>
      {/* HEADER */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        background: 'var(--surface-0)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => router.back()}
          className="tap-sm"
          style={{
            width: 36, height: 36, borderRadius: 10, border: 'none',
            background: 'var(--surface-2)', color: 'var(--text-secondary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={17} />
        </button>

        {recipient && (
          <Link href={`/profile/${recipient.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textDecoration: 'none' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              background: 'var(--grad-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 13,
            }}>
              {recipient.avatar_url
                ? <img src={recipient.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : recipient.username?.[0]?.toUpperCase()
              }
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                {recipient.full_name || recipient.username}
              </p>
              <p style={{ fontSize: 12, margin: 0, color: 'var(--text-tertiary)' }}>@{recipient.username}</p>
            </div>
          </Link>
        )}
      </header>

      {/* MESSAGES */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 32 }}>
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 64 }}>
            <p style={{ fontWeight: 700, fontSize: 17 }}>Say hi 👋</p>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Start the conversation</p>
          </div>
        )}
        {messages.map(renderBubble)}
        <div ref={bottomRef} />
      </div>

      {/* REPLY PREVIEW */}
      {replyTo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px',
          background: 'var(--surface-2)',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 3, borderRadius: 2, alignSelf: 'stretch',
            background: 'var(--nia-violet)', flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--nia-violet)', margin: '0 0 2px' }}>
              Replying to {replyTo.sender_id === currentUserId ? 'yourself' : `@${recipient?.username}`}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {replyTo.content ?? replyTo.file_name ?? 'Media'}
            </p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            style={{
              width: 24, height: 24, borderRadius: 6, border: 'none',
              background: 'var(--surface-3)', color: 'var(--text-tertiary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* INPUT BAR */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
      }}>
        {isRecording ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 16,
            background: 'rgba(239,68,68,0.07)',
            border: '1px solid rgba(239,68,68,0.15)',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} className="animate-pulse" />
            <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#ef4444', flex: 1, fontSize: 15 }}>
              {formatDuration(recordDuration)}
            </span>
            <button
              onClick={cancelRecording}
              style={{
                padding: '6px 14px', borderRadius: 10, border: 'none',
                background: 'var(--surface-3)', color: 'var(--text-secondary)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              onClick={stopRecording}
              style={{
                padding: '6px 14px', borderRadius: 10, border: 'none',
                background: '#ef4444', color: 'white',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Send
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            {/* Attachments */}
            <div style={{ display: 'flex', gap: 4, paddingBottom: 2 }}>
              {[
                { ref: fileRef, Icon: ImagePlus, accept: 'image/*', type: 'image' },
                { ref: videoRef, Icon: Video, accept: 'video/*', type: 'video' },
              ].map(({ ref, Icon, accept, type }) => (
                <button
                  key={type}
                  onClick={() => (ref as React.RefObject<HTMLInputElement>).current?.click()}
                  className="tap-sm"
                  style={{
                    width: 38, height: 38, borderRadius: 10, border: 'none',
                    background: 'var(--surface-2)', color: 'var(--text-secondary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon size={16} />
                </button>
              ))}
              <button
                onClick={startRecording}
                className="tap-sm"
                style={{
                  width: 38, height: 38, borderRadius: 10, border: 'none',
                  background: 'var(--surface-2)', color: 'var(--text-secondary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Mic size={16} />
              </button>
            </div>

            {/* Text input */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface-2)', borderRadius: 20, padding: '0 14px',
              minHeight: 40,
            }}>
              <input
                ref={inputRef}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(newMessage) } }}
                placeholder="Message…"
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Send */}
            <button
              onClick={() => sendMessage(newMessage)}
              disabled={!newMessage.trim() || sending || uploading}
              className="tap-sm"
              style={{
                width: 40, height: 40, borderRadius: 12, border: 'none',
                background: 'var(--grad-brand)', color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, opacity: !newMessage.trim() || sending || uploading ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {sending || uploading
                ? <Loader2 size={15} className="animate-spin" />
                : <Send size={15} />
              }
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileSelect(e, 'image')} />
        <input ref={videoRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => handleFileSelect(e, 'video')} />
      </div>
    </div>
  )
}