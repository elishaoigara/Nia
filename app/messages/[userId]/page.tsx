'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import {
  Send, ArrowLeft, ImagePlus, Mic, Video, Sticker,
  X, Loader2, MoreVertical, EyeOff, Eye, ShieldOff, Shield, Flag,
  Check, Plus, File as FileIcon, ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import MessageBubble, { ChatMessage } from '@/components/messages/MessageBubble'
import MessageActionSheet from '@/components/messages/MessageActionSheet'
import ChatGifPicker from '@/components/messages/ChatGifPicker'
import ReportSheet from '@/components/messages/ReportSheet'
import { asBoolean, asNullableString, asString, isRecord } from '@/lib/validation'

const PAGE_SIZE = 30
const TYPING_IDLE_MS = 2500

type Profile = {
  id: string
  username: string
  avatar_url: string | null
  full_name: string | null
  last_seen_at?: string | null
}

type PendingMedia = {
  file: File
  url: string
  detectedType: string
  displayType: 'image' | 'video' | 'file'
}

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// "Today" / "Yesterday" / "20 May" / "20 May 2025" — used for the date
// dividers inserted between messages sent on different calendar days, so
// a gap of days/weeks/months reads as a marked pause rather than as
// unexplained empty space.
function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  const sameYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString('en-GB', sameYear ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' })
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
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

function normalizeMsg(raw: unknown): ChatMessage {
  if (!isRecord(raw)) throw new TypeError('Invalid message payload')

  const reactions = isRecord(raw.reactions)
    ? Object.fromEntries(
        Object.entries(raw.reactions).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      )
    : {}

  return {
    id: asString(raw.id),
    sender_id: asString(raw.sender_id),
    recipient_id: asString(raw.recipient_id),
    content: asNullableString(raw.content),
    media_url: asNullableString(raw.media_url),
    media_type: asNullableString(raw.media_type),
    file_name: asNullableString(raw.file_name),
    view_once: asBoolean(raw.view_once),
    viewed_at: asNullableString(raw.viewed_at),
    reply_to: asNullableString(raw.reply_to),
    is_read: asBoolean(raw.is_read),
    created_at: asString(raw.created_at),
    reactions,
    edited_at: asNullableString(raw.edited_at),
    deleted_at: asNullableString(raw.deleted_at),
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
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null)
  const [mediaCaption, setMediaCaption] = useState('')

  const [isRecording, setIsRecording] = useState(false)
  const [recordDuration, setRecordDuration] = useState(0)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({})
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({})
  const [revealedMedia, setRevealedMedia] = useState<Set<string>>(new Set())

  const [actionSheetMsg, setActionSheetMsg] = useState<ChatMessage | null>(null)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showAttachTray, setShowAttachTray] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ messageId: string | null } | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [amIBlocking, setAmIBlocking] = useState(false)
  const [blockBusy, setBlockBusy] = useState(false)

  const [typingOther, setTypingOther] = useState(false)
  const [onlineOther, setOnlineOther] = useState(false)
  const [pendingRequest, setPendingRequest] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)

  // First unread incoming message, captured once at load — used to render a
  // single "New messages" divider. Stays fixed even after the 1.5s auto
  // mark-as-read flips is_read locally, so the divider doesn't vanish mid-view.
  const unreadDividerIdRef = useRef<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const fileDocRef = useRef<HTMLInputElement>(null)
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

      const ordered = (msgs ?? []).map(normalizeMsg).reverse()
      const firstUnread = ordered.find(m => !m.is_read && m.sender_id === recipientId)
      unreadDividerIdRef.current = firstUnread?.id ?? null
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
  }, [recipientId, router, supabase])

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
  }, [currentUserId, recipientId, supabase])

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
  }, [currentUserId, recipientId, supabase])

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
    const audioElements = audioRefs.current
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      Object.values(audioElements).forEach(audio => { audio.pause(); audio.src = '' })
    }
  }, [])

  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [audioDurations, messages])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    stickToBottom.current = nearBottom
    setShowScrollDown(!nearBottom && el.scrollHeight - el.scrollTop - el.clientHeight > 400)
    if (el.scrollTop < 60) loadOlder()
  }

  function scrollToBottomNow() {
    stickToBottom.current = true
    setShowScrollDown(false)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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

    const older = (data ?? []).map(normalizeMsg).reverse()
    if (older.length < PAGE_SIZE) setHasMore(false)

    const el = scrollRef.current
    const prevHeight = el?.scrollHeight ?? 0
    const prevScrollTop = el?.scrollTop ?? 0
    setMessages(prev => [...older, ...prev])
    requestAnimationFrame(() => {
      if (el) el.scrollTop = prevScrollTop + (el.scrollHeight - prevHeight)
    })
    setLoadingOlder(false)
  }, [currentUserId, recipientId, loadingOlder, hasMore, messages, supabase])

  async function uploadFile(file: File) {
    const ext = file.name.split('.').pop()
    const path = `${currentUserId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('message-media').upload(path, file)
    if (error) { showToast(`Upload failed: ${error.message}`); return null }
    const { data } = supabase.storage.from('message-media').getPublicUrl(path)
    return { url: data.publicUrl, name: file.name }
  }

  async function insertMessage(payload: Record<string, unknown>, tempId: string): Promise<string | null> {
    const { data, error } = await supabase.from('messages').insert(payload).select().single()
    if (!error && data) {
      setMessages(prev => prev.map(m => (m.id === tempId ? normalizeMsg(data) : m)))
      await supabase.from('notifications').insert({
        user_id: recipientId,
        actor_id: currentUserId,
        type: 'message',
        entity_id: currentUserId,
        message: 'sent you a message',
        is_read: false,
      })
      return data.id as string
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      showToast('Message failed to send')
      return null
    }
  }

  // Reads a clip's length directly from its (local or remote) URL, so a
  // voice note's duration is known before anyone taps play. Previously this
  // only happened inside toggleAudio, once playback started.
  function getAudioDuration(url: string): Promise<number> {
    return new Promise(resolve => {
      const audio = new Audio()
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', onLoaded)
        audio.removeEventListener('error', onErr)
      }
      const onLoaded = () => { cleanup(); resolve(audio.duration || 0) }
      const onErr = () => { cleanup(); resolve(0) }
      audio.addEventListener('loadedmetadata', onLoaded)
      audio.addEventListener('error', onErr)
      audio.src = url
    })
  }

  // Backfills durations for audio messages that arrive without one already
  // known — historical voice notes loaded from Supabase, and ones the other
  // person just sent — so the waveform shows a real length immediately
  // instead of "Voice message" until someone presses play.
  useEffect(() => {
    const missing = messages.filter(
      m => m.media_type === 'audio' && m.media_url && !m.id.startsWith('temp-') && audioDurations[m.id] === undefined
    )
    if (missing.length === 0) return
    let cancelled = false
    ;(async () => {
      for (const m of missing) {
        const d = await getAudioDuration(m.media_url!)
        if (cancelled) return
        setAudioDurations(prev => (prev[m.id] === undefined ? { ...prev, [m.id]: d } : prev))
      }
    })()
    return () => { cancelled = true }
  }, [audioDurations, messages])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') {
    const file = e.target.files?.[0]
    if (!file || !currentUserId || !recipientId) return
    const detectedType = type === 'file' ? 'file' : (file.type === 'image/gif' ? 'gif' : type)
    const previewUrl = URL.createObjectURL(file)
    setPendingMedia({ file, url: previewUrl, detectedType, displayType: type })
    setMediaCaption('')
    e.target.value = ''
  }

  function cancelPendingMedia() {
    if (pendingMedia && pendingMedia.url) URL.revokeObjectURL(pendingMedia.url)
    setPendingMedia(null)
    setMediaCaption('')
  }

  async function confirmSendMedia() {
    if (!pendingMedia || !currentUserId || !recipientId) return
    const { file, url: previewUrl, detectedType } = pendingMedia
    const tempId = `temp-${Date.now()}`
    const viewOnce = pendingMedia.displayType === 'file' ? false : pendingViewOnce
    const replyToId = replyTo?.id ?? null
    const caption = mediaCaption.trim() || null

    setMessages(prev => [...prev, {
      id: tempId, sender_id: currentUserId, recipient_id: recipientId,
      content: caption, media_url: previewUrl, media_type: detectedType, file_name: file.name,
      view_once: viewOnce, viewed_at: null, reply_to: replyToId, is_read: false,
      created_at: new Date().toISOString(), reactions: {}, edited_at: null, deleted_at: null,
    }])
    setReplyTo(null); setPendingViewOnce(false)
    setPendingMedia(null); setMediaCaption('')

    const result = await uploadFile(file)
    if (!result) { setMessages(prev => prev.filter(m => m.id !== tempId)); return }
    await insertMessage({
      sender_id: currentUserId, recipient_id: recipientId, content: caption,
      media_url: result.url, media_type: detectedType, file_name: result.name,
      view_once: viewOnce, reply_to: replyToId, is_read: false,
    }, tempId)
  }

  async function startRecording() {
    try {
      // Captured once, at the moment recording starts, so the same value is
      // used for the optimistic bubble and the real insert below — the insert
      // previously hardcoded reply_to: null, dropping any reply context.
      const replyToId = replyTo?.id ?? null
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
        // Read the length off the local blob right away instead of waiting
        // for someone to tap play.
        const duration = await getAudioDuration(previewUrl)
        setAudioDurations(prev => ({ ...prev, [tempId]: duration }))
        setMessages(prev => [...prev, {
          id: tempId, sender_id: currentUserId, recipient_id: recipientId,
          content: null, media_url: previewUrl, media_type: 'audio', file_name: 'Voice message',
          view_once: false, viewed_at: null, reply_to: replyToId, is_read: false,
          created_at: new Date().toISOString(), reactions: {}, edited_at: null, deleted_at: null,
        }])
        setReplyTo(null)
        const result = await uploadFile(file)
        if (!result) {
          setMessages(prev => prev.filter(m => m.id !== tempId))
          setAudioDurations(prev => {
            const next = { ...prev }
            delete next[tempId]
            return next
          })
          return
        }
        const realId = await insertMessage({
          sender_id: currentUserId, recipient_id: recipientId, content: null,
          media_url: result.url, media_type: 'audio', file_name: 'Voice message',
          view_once: false, reply_to: replyToId, is_read: false,
        }, tempId)
        if (realId) {
          setAudioDurations(prev => {
            const { [tempId]: d, ...rest } = prev
            return d !== undefined ? { ...rest, [realId]: d } : prev
          })
        }
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
    const replyToId = replyTo?.id ?? null
    setMessages(prev => [...prev, {
      id: tempId, sender_id: currentUserId, recipient_id: recipientId,
      content: null, media_url: url, media_type: 'gif', file_name: null,
      view_once: false, viewed_at: null, reply_to: replyToId, is_read: false,
      created_at: new Date().toISOString(), reactions: {}, edited_at: null, deleted_at: null,
    }])
    setReplyTo(null)
    await insertMessage({
      sender_id: currentUserId, recipient_id: recipientId, content: null,
      media_url: url, media_type: 'gif', file_name: null,
      view_once: false, reply_to: replyToId, is_read: false,
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
            <strong>@{recipient?.username}</strong> isn’t someone you follow. Accept to start chatting, or decline to hide this request.
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
        {messages.map((msg, i) => {
          // Two messages "cluster" when they're from the same sender and
          // less than 2 minutes apart. Deleted (unsent) messages always
          // break a cluster since they render as their own centered pill.
          const GROUP_WINDOW_MS = 2 * 60 * 1000
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const groupedWithNext = !!next && !msg.deleted_at && !next.deleted_at &&
            next.sender_id === msg.sender_id &&
            new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() < GROUP_WINDOW_MS

          const showDateDivider = !prev || !isSameDay(prev.created_at, msg.created_at)
          const showUnreadDivider = unreadDividerIdRef.current === msg.id

          return (
          <div key={msg.id}>
            {showDateDivider && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}>
                <span style={{
                  fontSize: 11.5, fontWeight: 700, color: 'var(--text-tertiary)',
                  background: 'var(--surface-1)', padding: '4px 12px', borderRadius: 12,
                }}>
                  {formatDayLabel(msg.created_at)}
                </span>
              </div>
            )}
            {showUnreadDivider && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 14px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--nia-coral)', opacity: 0.35 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--nia-coral)' }}>New messages</span>
                <div style={{ flex: 1, height: 1, background: 'var(--nia-coral)', opacity: 0.35 }} />
              </div>
            )}
            <MessageBubble
              msg={msg}
              isOwn={msg.sender_id === currentUserId}
              currentUserId={currentUserId}
              recipient={recipient}
              replyMsg={messages.find(m => m.id === msg.reply_to)}
              isViewOnceRevealed={revealedMedia.has(msg.id)}
              onRevealViewOnce={revealViewOnce}
              isGroupedWithNext={groupedWithNext}
              playingAudio={playingAudio}
              audioProgress={audioProgress[msg.id] ?? 0}
              audioDuration={audioDurations[msg.id] ?? 0}
              onToggleAudio={toggleAudio}
              onSeekAudio={seekAudio}
              onSwipeReply={setReplyTo}
              onLongPress={setActionSheetMsg}
              onDoubleTapReact={() => reactToMessage(msg, '❤️')}
            />
          </div>
          )
        })}
        {typingOther && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: 'var(--grad-brand)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 10 }}>
              {recipient?.avatar_url
                ? <img src={recipient.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : recipient?.username?.[0]?.toUpperCase()}
            </div>
            <div className="animate-pop" style={{ display: 'flex', gap: 4, alignItems: 'center', background: 'var(--surface-2)', borderRadius: '18px 18px 18px 5px', padding: '11px 14px' }}>
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
              <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {showScrollDown && (
        <button
          onClick={scrollToBottomNow}
          className="tap-sm"
          style={{
            position: 'absolute', bottom: 84, right: 16, zIndex: 30,
            width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)',
            background: 'var(--surface-1)', color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
          }}
          aria-label="Scroll to latest messages"
        >
          <ChevronDown size={18} />
        </button>
      )}

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

      {/* INPUT BAR */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', flexShrink: 0, paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))', position: 'relative' }}>
        {showGifPicker && <ChatGifPicker onPick={sendGif} onClose={() => setShowGifPicker(false)} />}

        {isRecording ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 16, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} className="animate-pulse" />
            <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#ef4444', flex: 1, fontSize: 15 }}>{formatDuration(recordDuration)}</span>
            <button onClick={cancelRecording} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: 'var(--surface-3)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={stopRecording} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: '#ef4444', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Send</button>
          </div>
        ) : (
          <>
            {/* Attachment tray — a single row that only appears when + is tapped,
                so the default bar never wraps onto a second line. */}
            {showAttachTray && (
              <div style={{ display: 'flex', gap: 18, padding: '4px 10px 10px', overflowX: 'auto' }}>
                {[
                  { icon: ImagePlus, label: 'Photo', onClick: () => { setShowAttachTray(false); fileRef.current?.click() } },
                  { icon: Video, label: 'Video', onClick: () => { setShowAttachTray(false); videoRef.current?.click() } },
                  { icon: Sticker, label: 'GIF', onClick: () => { setShowAttachTray(false); setShowGifPicker(true) } },
                  { icon: FileIcon, label: 'File', onClick: () => { setShowAttachTray(false); fileDocRef.current?.click() } },
                  { icon: pendingViewOnce ? Eye : EyeOff, label: 'Once', onClick: () => { setPendingViewOnce(v => !v); setShowAttachTray(false) }, active: pendingViewOnce },
                ].map(({ icon: Icon, label, onClick, active }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="tap-sm"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <span style={{
                      width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: active ? 'var(--nia-violet)' : 'var(--surface-2)', color: active ? '#fff' : 'var(--text-secondary)',
                    }}>
                      <Icon size={19} />
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>{label}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setShowAttachTray(v => !v)}
                className="tap-sm"
                style={{
                  width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0,
                  background: showAttachTray ? 'var(--surface-3)' : 'var(--surface-2)', color: 'var(--text-secondary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: showAttachTray ? 'rotate(45deg)' : 'none', transition: 'transform 0.15s',
                }}
              >
                <Plus size={18} />
              </button>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', borderRadius: 20, padding: '0 14px', minHeight: 38 }}>
                {pendingViewOnce && !editingId && <Eye size={13} color="var(--nia-violet)" style={{ flexShrink: 0 }} />}
                <input
                  ref={inputRef}
                  value={newMessage}
                  onChange={e => handleTypingInput(e.target.value)}
                  onFocus={() => setShowAttachTray(false)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
                  placeholder={editingId ? 'Edit message…' : pendingViewOnce ? 'Disappearing message…' : 'Message…'}
                  style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontSize: 14.5, color: 'var(--text-primary)', fontFamily: 'inherit' }}
                />
              </div>

              {newMessage.trim() ? (
                <button
                  onClick={sendText}
                  disabled={sending}
                  className="tap-sm"
                  style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'var(--grad-brand)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: sending ? 0.6 : 1 }}
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : editingId ? <Check size={15} /> : <Send size={15} />}
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="tap-sm"
                  style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'var(--grad-brand)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <Mic size={16} />
                </button>
              )}
            </div>
          </>
        )}

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileSelect(e, 'image')} />
        <input ref={videoRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => handleFileSelect(e, 'video')} />
        <input ref={fileDocRef} type="file" style={{ display: 'none' }} onChange={e => handleFileSelect(e, 'file')} />
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

      {pendingMedia && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,8,14,0.96)', zIndex: 70, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', flexShrink: 0 }}>
            <button onClick={cancelPendingMedia} className="tap-sm" style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={17} />
            </button>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
              {pendingMedia.displayType === 'video' ? 'Send video' : pendingMedia.displayType === 'file' ? 'Send file' : 'Send photo'}
            </span>
            {pendingMedia.displayType !== 'file' && (
              <button
                onClick={() => setPendingViewOnce(v => !v)}
                className="tap-sm"
                style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: pendingViewOnce ? 'var(--nia-violet)' : 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {pendingViewOnce ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            )}
            {pendingMedia.displayType === 'file' && <div style={{ width: 36 }} />}
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 14px', minHeight: 0 }}>
            {pendingMedia.displayType === 'video' ? (
              <video src={pendingMedia.url} controls style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12 }} />
            ) : pendingMedia.displayType === 'file' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.08)', maxWidth: '100%' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileIcon size={20} color="#fff" />
                </div>
                <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                  {pendingMedia.file.name}
                </p>
              </div>
            ) : (
              <img src={pendingMedia.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, objectFit: 'contain' }} />
            )}
          </div>

          <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '0 14px', display: 'flex', alignItems: 'center', minHeight: 40 }}>
              <input
                value={mediaCaption}
                onChange={e => setMediaCaption(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmSendMedia() } }}
                placeholder="Add a caption…"
                autoFocus
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 14.5, fontFamily: 'inherit' }}
              />
            </div>
            <button
              onClick={confirmSendMedia}
              className="tap-sm"
              style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'var(--grad-brand)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}