'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import {
  Send, ArrowLeft, ImagePlus, Mic, Video, Sticker,
  X, Loader2, MoreVertical, EyeOff, Eye, ShieldOff, Shield, Flag,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import MessageBubble, { ChatMessage } from '@/components/messages/MessageBubble'
import MessageActionSheet from '@/components/messages/MessageActionSheet'
import ChatGifPicker from '@/components/messages/ChatGifPicker'
import ReportSheet from '@/components/messages/ReportSheet'

const PAGE_SIZE = 30
const TYPING_IDLE_MS = 2500

type Profile = {
  id: string
  username: string
  avatar_url: string | null
  full_name: string | null
  last_seen_at?: string | null
}

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function presenceLabel(online: boolean, lastSeen: string | null | undefined) {
  if (online) return 'Online'
  if (!lastSeen) return null
  const s = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000)
  if (s < 60) return 'Active just now'
  if (s < 3600) return `Active ${Math.floor(s / 60)}m ago`
  if (s < 86400) return `Active ${Math.floor(s / 3600)}h ago`
  return `Active ${Math.floor(s / 86400)}d ago`
}

function normalizeMsg(raw: any): ChatMessage {
  return {
    ...raw,
    reactions: raw.reactions ?? {},
    edited_at: raw.edited_at ?? null,
    deleted_at: raw.deleted_at ?? null,
  }
}

export default function DirectMessagePage() {
  const supabase = createClient()
  const { userId } = useParams() as { userId?: string }
  const router = useRouter()
  const recipientId = userId ?? null

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [recipient, setRecipient] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)

  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingViewOnce, setPendingViewOnce] = useState(false)

  const [isRecording, setIsRecording] = useState(false)
  const [recordDuration, setRecordDuration] = useState(0)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({})
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({})
  const [revealedMedia, setRevealedMedia] = useState<Set<string>>(new Set())

  const [actionSheetMsg, setActionSheetMsg] = useState<ChatMessage | null>(null)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ messageId: string | null } | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [amIBlocking, setAmIBlocking] = useState(false)
  const [blockBusy, setBlockBusy] = useState(false)

  const [typingOther, setTypingOther] = useState(false)
  const [onlineOther, setOnlineOther] = useState(false)
  const [pendingRequest, setPendingRequest] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const stickToBottom = useRef(true)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  // ---------------------------------------------------------------------
  // Load conversation history + initial state. Kept separate from the
  // realtime subscription effect below so the subscription doesn't get
  // torn down and recreated every time messages/profile data changes.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!recipientId) { setLoading(false); return }
    let cancelled = false

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (cancelled) return
      setCurrentUserId(user.id)

      const [{ data: profile }, { data: msgs }, { data: blockRow }, { data: reqRow }] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url, full_name, last_seen_at').eq('id', recipientId).single(),
        supabase.from('messages').select('*')
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE),
        supabase.from('blocks').select('*').eq('blocker_id', user.id).eq('blocked_id', recipientId).maybeSingle(),
        supabase.from('message_requests').select('*').eq('user_id', user.id).eq('other_id', recipientId).maybeSingle(),
      ])
      if (cancelled) return

      const ordered = ((msgs as any[]) ?? []).map(normalizeMsg).reverse()
      setRecipient(profile as Profile)
      setMessages(ordered)
      setHasMore(ordered.length === PAGE_SIZE)
      setAmIBlocking(!!blockRow)
      setPendingRequest(!!reqRow && reqRow.status === 'pending')
      setLoading(false)

      await supabase.from('messages').update({ is_read: true })
        .eq('recipient_id', user.id).eq('sender_id', recipientId).eq('is_read', false)
      await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id)
    }
    init()

    return () => { cancelled = true }
  }, [recipientId]) // eslint-disable-line

  // ---------------------------------------------------------------------
  // Realtime message subscription. Created directly in this effect (not
  // inside a nested async function) so the cleanup function returned here
  // is the one React actually registers — the previous version returned
  // its cleanup from an inner `async function init()`, which React never
  // sees, so every open conversation leaked a channel forever.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!recipientId || !currentUserId) return

    const channel = supabase.channel(`dm-${[currentUserId, recipientId].sort().join('_')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${currentUserId}` }, payload => {
        const msg = normalizeMsg(payload.new)
        if (msg.sender_id !== recipientId) return
        setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
        supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
        const msg = normalizeMsg(payload.new)
        const involvesUs =
          (msg.sender_id === currentUserId && msg.recipient_id === recipientId) ||
          (msg.sender_id === recipientId && msg.recipient_id === currentUserId)
        if (!involvesUs) return
        setMessages(prev => prev.map(m => (m.id === msg.id ? msg : m)))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, recipientId]) // eslint-disable-line

  // ---------------------------------------------------------------------
  // Presence + typing indicator, shared per conversation pair.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!recipientId || !currentUserId) return
    const roomKey = `presence-${[currentUserId, recipientId].sort().join('_')}`
    const channel = supabase.channel(roomKey, { config: { presence: { key: currentUserId } } })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, unknown[]>
        setOnlineOther(!!state[recipientId] && state[recipientId].length > 0)
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.user !== recipientId) return
        setTypingOther(!!payload.typing)
        if (payload.typing) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setTypingOther(false), TYPING_IDLE_MS + 500)
        }
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') await channel.track({ online: true })
      })

    presenceChannelRef.current = channel
    const heartbeat = setInterval(() => {
      supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', currentUserId)
    }, 30000)

    return () => {
      clearInterval(heartbeat)
      supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', currentUserId)
      supabase.removeChannel(channel)
      presenceChannelRef.current = null
    }
  }, [currentUserId, recipientId]) // eslint-disable-line

  function broadcastTyping(typing: boolean) {
    presenceChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { user: currentUserId, typing } })
  }

  function handleTypingInput(value: string) {
    setNewMessage(value)
    broadcastTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), TYPING_IDLE_MS)
  }

  // Cleanup timers / audio elements on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      Object.values(audioRefs.current).forEach(a => { a.pause(); a.src = '' })
    }
  }, [])

  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (el.scrollTop < 60) loadOlder()
  }

  const loadOlder = useCallback(async () => {
    if (!currentUserId || !recipientId || loadingOlder || !hasMore || messages.length === 0) return
    setLoadingOlder(true)
    const oldest = messages[0].created_at
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentUserId})`)
      .lt('created_at', oldest)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    const older = ((data as any[]) ?? []).map(normalizeMsg).reverse()
    if (older.length < PAGE_SIZE) setHasMore(false)

    const el = scrollRef.current
    const prevHeight = el?.scrollHeight ?? 0
    const prevScrollTop = el?.scrollTop ?? 0
    setMessages(prev => [...older, ...prev])
    requestAnimationFrame(() => {
      if (el) el.scrollTop = prevScrollTop + (el.scrollHeight - prevHeight)
    })
    setLoadingOlder(false)
  }, [currentUserId, recipientId, loadingOlder, hasMore, messages]) // eslint-disable-line

  async function uploadFile(file: File) {
    const ext = file.name.split('.').pop()
    const path = `${currentUserId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('message-media').upload(path, file)
    if (error) { showToast(`Upload failed: ${error.message}`); return null }
    const { data } = supabase.storage.from('message-media').getPublicUrl(path)
    return { url: data.publicUrl, name: file.name }
  }

  async function insertMessage(payload: Record<string, any>, tempId: string) {
    const { data, error } = await supabase.from('messages').insert(payload).select().single()
    if (!error && data) {
      setMessages(prev => prev.map(m => (m.id === tempId ? normalizeMsg(data) : m)))
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      showToast('Message failed to send')
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, type: string) {
    const file = e.target.files?.[0]
    if (!file || !currentUserId || !recipientId) return
    const detectedType = file.type === 'image/gif' ? 'gif' : type
    const tempId = `temp-${Date.now()}`
    const previewUrl = URL.createObjectURL(file)
    const viewOnce = pendingViewOnce

    setMessages(prev => [...prev, {
      id: tempId, sender_id: currentUserId, recipient_id: recipientId,
      content: null, media_url: previewUrl, media_type: detectedType, file_name: file.name,
      view_once: viewOnce, viewed_at: null, reply_to: replyTo?.id ?? null, is_read: false,
      created_at: new Date().toISOString(), reactions: {}, edited_at: null, deleted_at: null,
    }])
    setReplyTo(null); setPendingViewOnce(false)
    e.target.value = ''

    const result = await uploadFile(file)
    if (!result) { setMessages(prev => prev.filter(m => m.id !== tempId)); return }
    await insertMessage({
      sender_id: currentUserId, recipient_id: recipientId, content: null,
      media_url: result.url, media_type: detectedType, file_name: result.name,
      view_once: viewOnce, reply_to: null, is_read: false,
    }, tempId)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mrRef.current = mr; chunksRef.current = []
      mr.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (!currentUserId || !recipientId) return
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
        const tempId = `temp-${Date.now()}`
        const previewUrl = URL.createObjectURL(blob)
        setMessages(prev => [...prev, {
          id: tempId, sender_id: currentUserId, recipient_id: recipientId,
          content: null, media_url: previewUrl, media_type: 'audio', file_name: 'Voice message',
          view_once: false, viewed_at: null, reply_to: replyTo?.id ?? null, is_read: false,
          created_at: new Date().toISOString(), reactions: {}, edited_at: null, deleted_at: null,
        }])
        setReplyTo(null)
        const result = await uploadFile(file)
        if (!result) { setMessages(prev => prev.filter(m => m.id !== tempId)); return }
        await insertMessage({
          sender_id: currentUserId, recipient_id: recipientId, content: null,
          media_url: result.url, media_type: 'audio', file_name: 'Voice message',
          view_once: false, reply_to: null, is_read: false,
        }, tempId)
      }
      mr.start(); setIsRecording(true)
      timerRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000)
    } catch { showToast('Microphone access denied') }
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

  async function sendText() {
    if (!currentUserId || !recipientId) return
    if (editingId) { await saveEdit(); return }
    const text = newMessage.trim()
    if (!text) return
    setSending(true)
    broadcastTyping(false)
    const tempId = `temp-${Date.now()}`
    const viewOnce = pendingViewOnce
    const optimistic: ChatMessage = {
      id: tempId, sender_id: currentUserId, recipient_id: recipientId,
      content: text, media_url: null, media_type: null, file_name: null,
      view_once: viewOnce, viewed_at: null, reply_to: replyTo?.id ?? null, is_read: false,
      created_at: new Date().toISOString(), reactions: {}, edited_at: null, deleted_at: null,
    }
    setMessages(prev => [...prev, optimistic])
    setNewMessage(''); setReplyTo(null); setPendingViewOnce(false)
    await insertMessage({
      sender_id: currentUserId, recipient_id: recipientId, content: text,
      media_url: null, media_type: null, file_name: null,
      view_once: viewOnce, reply_to: optimistic.reply_to, is_read: false,
    }, tempId)
    setSending(false)
  }

  async function sendGif(url: string) {
    if (!currentUserId || !recipientId) return
    setShowGifPicker(false)
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId, sender_id: currentUserId, recipient_id: recipientId,
      content: null, media_url: url, media_type: 'gif', file_name: null,
      view_once: false, viewed_at: null, reply_to: replyTo?.id ?? null, is_read: false,
      created_at: new Date().toISOString(), reactions: {}, edited_at: null, deleted_at: null,
    }])
    setReplyTo(null)
    await insertMessage({
      sender_id: currentUserId, recipient_id: recipientId, content: null,
      media_url: url, media_type: 'gif', file_name: null,
      view_once: false, reply_to: null, is_read: false,
    }, tempId)
  }

  function startEdit(msg: ChatMessage) {
    setEditingId(msg.id)
    setNewMessage(msg.content ?? '')
    setReplyTo(null)
    inputRef.current?.focus()
  }

  async function saveEdit() {
    if (!editingId) return
    const text = newMessage.trim()
    if (!text) return
    const editedAt = new Date().toISOString()
    setMessages(prev => prev.map(m => (m.id === editingId ? { ...m, content: text, edited_at: editedAt } : m)))
    setEditingId(null); setNewMessage('')
    await supabase.from('messages').update({ content: text, edited_at: editedAt }).eq('id', editingId)
  }

  async function unsendMessage(msg: ChatMessage) {
    const deletedAt = new Date().toISOString()
    setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, deleted_at: deletedAt } : m)))
    await supabase.from('messages').update({ deleted_at: deletedAt }).eq('id', msg.id)
  }

  async function reactToMessage(msg: ChatMessage, emoji: string) {
    if (!currentUserId) return
    const reactions = { ...msg.reactions }
    if (reactions[currentUserId] === emoji) delete reactions[currentUserId]
    else reactions[currentUserId] = emoji
    setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, reactions } : m)))
    await supabase.from('messages').update({ reactions }).eq('id', msg.id)
  }

  function toggleAudio(msgId: string, url: string) {
    if (playingAudio === msgId) { audioRefs.current[msgId]?.pause(); setPlayingAudio(null); return }
    if (playingAudio && audioRefs.current[playingAudio]) audioRefs.current[playingAudio].pause()
    if (!audioRefs.current[msgId]) {
      const audio = new Audio(url)
      audio.onloadedmetadata = () => setAudioDurations(prev => ({ ...prev, [msgId]: audio.duration }))
      audio.ontimeupdate = () => setAudioProgress(prev => ({ ...prev, [msgId]: audio.currentTime }))
      audio.onended = () => setPlayingAudio(null)
      audioRefs.current[msgId] = audio
    }
    audioRefs.current[msgId].play()
    setPlayingAudio(msgId)
  }

  function seekAudio(msgId: string, fraction: number) {
    const audio = audioRefs.current[msgId]
    const duration = audioDurations[msgId]
    if (!audio || !duration) return
    audio.currentTime = fraction * duration
    setAudioProgress(prev => ({ ...prev, [msgId]: audio.currentTime }))
    if (playingAudio !== msgId) { audio.play(); setPlayingAudio(msgId) }
  }

  async function toggleBlock() {
    if (!currentUserId || !recipientId) return
    setBlockBusy(true)
    if (amIBlocking) {
      await supabase.from('blocks').delete().eq('blocker_id', currentUserId).eq('blocked_id', recipientId)
      setAmIBlocking(false)
      showToast('Unblocked')
    } else {
      await supabase.from('blocks').insert({ blocker_id: currentUserId, blocked_id: recipientId })
      setAmIBlocking(true)
      showToast('Blocked — they can no longer message you')
    }
    setBlockBusy(false)
    setShowMenu(false)
  }

  async function submitReport(reason: string) {
    if (!currentUserId || !recipientId) return
    await supabase.from('message_reports').insert({
      reporter_id: currentUserId, reported_user_id: recipientId,
      message_id: reportTarget?.messageId ?? null, reason,
    })
  }

  async function acceptRequest() {
    if (!currentUserId || !recipientId) return
    setPendingRequest(false)
    await supabase.from('message_requests').update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('user_id', currentUserId).eq('other_id', recipientId)
  }

  async function declineRequest() {
    if (!currentUserId || !recipientId) return
    await supabase.from('message_requests').update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('user_id', currentUserId).eq('other_id', recipientId)
    router.push('/messages')
  }

  function revealViewOnce(id: string) {
    setRevealedMedia(prev => new Set([...prev, id]))
    const msg = messages.find(m => m.id === id)
    if (msg && msg.sender_id !== currentUserId && !msg.viewed_at) {
      const viewedAt = new Date().toISOString()
      setMessages(prev => prev.map(m => (m.id === id ? { ...m, viewed_at: viewedAt } : m)))
      supabase.from('messages').update({ viewed_at: viewedAt }).eq('id', id)
    }
  }

  const presence = presenceLabel(onlineOther, recipient?.last_seen_at)

  if (!recipientId) {
    return <div style={{ textAlign: 'center', padding: 32 }}>Invalid conversation</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - var(--nav-top))', maxWidth: '42rem', width: '100%', margin: '0 auto', position: 'relative' }}>
      {/* HEADER */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface-0)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button onClick={() => router.back()} className="tap-sm" style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ArrowLeft size={17} />
        </button>

        {recipient && (
          <Link href={`/profile/${recipient.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textDecoration: 'none' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>
                {recipient.avatar_url
                  ? <img src={recipient.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : recipient.username?.[0]?.toUpperCase()}
              </div>
              {onlineOther && (
                <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid var(--surface-0)' }} />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                {recipient.full_name || recipient.username}
              </p>
              <p style={{ fontSize: 12, margin: 0, color: typingOther ? 'var(--nia-violet)' : 'var(--text-tertiary)', fontWeight: typingOther ? 700 : 400 }}>
                {typingOther ? 'Typing…' : presence ?? `@${recipient.username}`}
              </p>
            </div>
          </Link>
        )}

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setShowMenu(v => !v)} className="tap-sm" style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MoreVertical size={17} />
          </button>
          {showMenu && (
            <>
              <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 50, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 6, minWidth: 190, boxShadow: '0 6px 20px rgba(0,0,0,0.15)' }}>
                <button onClick={toggleBlock} disabled={blockBusy} className="tap-sm" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', border: 'none', background: 'transparent', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)', textAlign: 'left' }}>
                  {amIBlocking ? <Shield size={15} /> : <ShieldOff size={15} />}
                  {amIBlocking ? 'Unblock' : 'Block'}
                </button>
                <button onClick={() => { setReportTarget({ messageId: null }); setShowMenu(false) }} className="tap-sm" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', border: 'none', background: 'transparent', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--nia-coral)', textAlign: 'left' }}>
                  <Flag size={15} /> Report
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* MESSAGE REQUEST BANNER */}
      {pendingRequest && (
        <div style={{ padding: '10px 14px', background: 'var(--surface-1)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
            <strong>@{recipient?.username}</strong> isn't someone you follow. Accept to start chatting, or decline to hide this request.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={acceptRequest} className="tap-sm" style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', background: 'var(--grad-brand)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Accept</button>
            <button onClick={declineRequest} className="tap-sm" style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Decline</button>
          </div>
        </div>
      )}

      {/* MESSAGES */}
      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
        {loadingOlder && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 10 }}>
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}
        {!loading && !hasMore && messages.length > 0 && (
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', margin: '4px 0 12px' }}>
            Start of your conversation
          </p>
        )}
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
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.sender_id === currentUserId}
            currentUserId={currentUserId}
            recipient={recipient}
            replyMsg={messages.find(m => m.id === msg.reply_to)}
            isViewOnceRevealed={revealedMedia.has(msg.id)}
            onRevealViewOnce={revealViewOnce}
            playingAudio={playingAudio}
            audioProgress={audioProgress[msg.id] ?? 0}
            audioDuration={audioDurations[msg.id] ?? 0}
            onToggleAudio={toggleAudio}
            onSeekAudio={seekAudio}
            onSwipeReply={setReplyTo}
            onLongPress={setActionSheetMsg}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface-3)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, boxShadow: '0 4px 14px rgba(0,0,0,0.2)', zIndex: 55 }}>
          {toast}
        </div>
      )}

      {/* REPLY / EDIT PREVIEW */}
      {(replyTo || editingId) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ width: 3, borderRadius: 2, alignSelf: 'stretch', background: 'var(--nia-violet)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--nia-violet)', margin: '0 0 2px' }}>
              {editingId ? 'Editing message' : `Replying to ${replyTo!.sender_id === currentUserId ? 'yourself' : `@${recipient?.username}`}`}
            </p>
            {!editingId && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {replyTo!.content ?? replyTo!.file_name ?? 'Media'}
              </p>
            )}
          </div>
          <button onClick={() => { setReplyTo(null); setEditingId(null); setNewMessage('') }} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'var(--surface-3)', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* VIEW-ONCE TOGGLE PREVIEW */}
      {pendingViewOnce && !editingId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(91,33,182,0.08)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <Eye size={13} color="var(--nia-violet)" />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--nia-violet)', flex: 1 }}>Next message disappears after it's opened</span>
          <button onClick={() => setPendingViewOnce(false)} style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'var(--surface-3)', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* INPUT BAR */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', position: 'relative' }}>
        {showGifPicker && <ChatGifPicker onPick={sendGif} onClose={() => setShowGifPicker(false)} />}

        {isRecording ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 16, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} className="animate-pulse" />
            <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#ef4444', flex: 1, fontSize: 15 }}>{formatDuration(recordDuration)}</span>
            <button onClick={cancelRecording} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: 'var(--surface-3)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={stopRecording} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: '#ef4444', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Send</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', gap: 4, paddingBottom: 2, flexWrap: 'wrap' }}>
              <button onClick={() => fileRef.current?.click()} className="tap-sm" style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImagePlus size={16} />
              </button>
              <button onClick={() => videoRef.current?.click()} className="tap-sm" style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={16} />
              </button>
              <button onClick={startRecording} className="tap-sm" style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mic size={16} />
              </button>
              <button onClick={() => setShowGifPicker(v => !v)} className="tap-sm" style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: showGifPicker ? 'var(--surface-3)' : 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sticker size={16} />
              </button>
              <button onClick={() => setPendingViewOnce(v => !v)} className="tap-sm" style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: pendingViewOnce ? 'var(--nia-violet)' : 'var(--surface-2)', color: pendingViewOnce ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {pendingViewOnce ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', borderRadius: 20, padding: '0 14px', minHeight: 40 }}>
              <input
                ref={inputRef}
                value={newMessage}
                onChange={e => handleTypingInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
                placeholder={editingId ? 'Edit message…' : 'Message…'}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit' }}
              />
            </div>

            <button
              onClick={sendText}
              disabled={!newMessage.trim() || sending}
              className="tap-sm"
              style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: 'var(--grad-brand)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: !newMessage.trim() || sending ? 0.4 : 1, transition: 'opacity 0.15s' }}
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : editingId ? <Check size={15} /> : <Send size={15} />}
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileSelect(e, 'image')} />
        <input ref={videoRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => handleFileSelect(e, 'video')} />
      </div>

      {actionSheetMsg && (
        <MessageActionSheet
          isOwn={actionSheetMsg.sender_id === currentUserId}
          hasText={!!actionSheetMsg.content}
          myReaction={currentUserId ? actionSheetMsg.reactions[currentUserId] : null}
          onClose={() => setActionSheetMsg(null)}
          onReact={emoji => reactToMessage(actionSheetMsg, emoji)}
          onReply={() => setReplyTo(actionSheetMsg)}
          onCopy={actionSheetMsg.content ? () => navigator.clipboard.writeText(actionSheetMsg.content!) : undefined}
          onEdit={actionSheetMsg.sender_id === currentUserId ? () => startEdit(actionSheetMsg) : undefined}
          onUnsend={actionSheetMsg.sender_id === currentUserId ? () => unsendMessage(actionSheetMsg) : undefined}
          onReport={actionSheetMsg.sender_id !== currentUserId ? () => setReportTarget({ messageId: actionSheetMsg.id }) : undefined}
        />
      )}

      {reportTarget && (
        <ReportSheet onClose={() => setReportTarget(null)} onSubmit={submitReport} />
      )}
    </div>
  )
}