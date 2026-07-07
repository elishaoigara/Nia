'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  File as FileIcon, Play, Pause, Eye, Reply, Check, CheckCheck, Loader2,
} from 'lucide-react'

export type ChatMessage = {
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
  reactions: Record<string, string>
  edited_at: string | null
  deleted_at: string | null
}

type Profile = { id: string; username: string; avatar_url: string | null; full_name: string | null }

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Deterministic pseudo-random bar heights per message, so the same voice
// note always draws the same waveform instead of jumping around on re-render.
function waveformBars(seed: string, count = 24) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const bars: number[] = []
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    bars.push(0.28 + (h % 100) / 100 * 0.72)
  }
  return bars
}

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) s = 0
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

const SWIPE_THRESHOLD = 56
const LONG_PRESS_MS = 420

export default function MessageBubble({
  msg, isOwn, currentUserId, recipient, replyMsg,
  isViewOnceRevealed, onRevealViewOnce,
  isGroupedWithPrev = false, isGroupedWithNext = false,
  playingAudio, audioProgress, audioDuration, onToggleAudio, onSeekAudio,
  onSwipeReply, onLongPress, onDoubleTapReact,
}: {
  msg: ChatMessage
  isOwn: boolean
  currentUserId: string | null
  recipient: Profile | null
  replyMsg?: ChatMessage
  isViewOnceRevealed: boolean
  onRevealViewOnce: (id: string) => void
  // True when the previous/next message in the list is from the same sender
  // and close enough in time to be part of the same visual cluster. Used to
  // collapse repeated avatars and per-bubble timestamps into one per cluster.
  isGroupedWithPrev?: boolean
  isGroupedWithNext?: boolean
  playingAudio: string | null
  audioProgress: number
  audioDuration: number
  onToggleAudio: (id: string, url: string) => void
  onSeekAudio: (id: string, fraction: number) => void
  onSwipeReply: (msg: ChatMessage) => void
  onLongPress: (msg: ChatMessage) => void
  onDoubleTapReact: (msg: ChatMessage) => void
}) {
  const isTemp = msg.id.startsWith('temp-')
  const isUploading = isTemp && !!msg.media_url?.startsWith('blob:')
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [heartBurst, setHeartBurst] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const longPressFired = useRef(false)
  const lastTapAt = useRef(0)

  function clearLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (isTemp || msg.deleted_at) return
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
    longPressFired.current = false
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      onLongPress(msg)
      if (navigator.vibrate) navigator.vibrate(8)
    }, LONG_PRESS_MS)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStart.current || isTemp || msg.deleted_at) return
    const t = e.touches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) clearLongPress()
    // Only allow the reply-reveal swipe once it's clearly horizontal.
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      setDragging(true)
      const clamped = Math.max(-SWIPE_THRESHOLD * 1.4, Math.min(SWIPE_THRESHOLD * 1.4, dx))
      setDragX(clamped)
    }
  }

  function handleTouchEnd() {
    clearLongPress()
    const wasSwipe = Math.abs(dragX) >= SWIPE_THRESHOLD && !longPressFired.current
    if (wasSwipe) {
      onSwipeReply(msg)
      if (navigator.vibrate) navigator.vibrate(6)
    } else if (!longPressFired.current && Math.abs(dragX) < 10) {
      const now = Date.now()
      if (now - lastTapAt.current < 300) {
        lastTapAt.current = 0
        onDoubleTapReact(msg)
        setHeartBurst(true)
        if (navigator.vibrate) navigator.vibrate(8)
        setTimeout(() => setHeartBurst(false), 700)
      } else {
        lastTapAt.current = now
      }
    }
    setDragging(false)
    setDragX(0)
    touchStart.current = null
  }

  const reactionCounts = Object.values(msg.reactions ?? {}).reduce<Record<string, number>>((acc, e) => {
    acc[e] = (acc[e] ?? 0) + 1
    return acc
  }, {})
  const hasReactions = Object.keys(reactionCounts).length > 0

  if (msg.deleted_at) {
    return (
      <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
        <div style={{
          padding: '8px 14px', borderRadius: 16, fontSize: 13, fontStyle: 'italic',
          color: 'var(--text-tertiary)', background: 'var(--surface-2)',
        }}>
          {isOwn ? 'You unsent a message' : 'Message unsent'}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: hasReactions ? 14 : (isGroupedWithNext ? 2 : 6), alignItems: 'flex-end', gap: 6, position: 'relative' }}
      className="group"
    >
      {/* Swipe-reveal reply icon */}
      {dragging && (
        <div style={{
          position: 'absolute', top: '50%', transform: 'translateY(-50%)',
          [dragX > 0 ? 'left' : 'right']: 4,
          opacity: Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD),
          color: 'var(--nia-violet)', display: 'flex',
        } as React.CSSProperties}>
          <Reply size={18} />
        </div>
      )}

      {/* Double-tap-to-react heart burst */}
      {heartBurst && (
        <span
          className="float-heart animate-like-pop"
          style={{ [isOwn ? 'right' : 'left']: 24, bottom: 36, fontSize: 28 } as React.CSSProperties}
        >
          ❤️
        </span>
      )}

      {!isOwn && (
        isGroupedWithNext ? (
          // Mid-cluster bubble: reserve the avatar's width so the bubble
          // column still lines up, without redrawing the avatar every time.
          <div style={{ width: 26, flexShrink: 0 }} />
        ) : (
          <Link href={`/profile/${recipient?.id}`} style={{ flexShrink: 0, marginBottom: 2 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 10 }}>
              {recipient?.avatar_url
                ? <img src={recipient.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : recipient?.username?.[0]?.toUpperCase()}
            </div>
          </Link>
        )
      )}

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 3,
          alignItems: isOwn ? 'flex-end' : 'flex-start',
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
          touchAction: 'pan-y',
        }}
      >
        {msg.reply_to && replyMsg && (
          <div style={{ fontSize: 12, padding: '6px 10px', borderRadius: 10, background: 'var(--surface-3)', borderLeft: '3px solid var(--nia-violet)', maxWidth: '100%', opacity: 0.75 }}>
            <p style={{ fontWeight: 700, color: 'var(--nia-violet)', margin: '0 0 2px' }}>
              {replyMsg.sender_id === currentUserId ? 'You' : `@${recipient?.username}`}
            </p>
            <p style={{ color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {replyMsg.deleted_at ? 'Message unsent' : (replyMsg.content ?? replyMsg.file_name ?? 'Media')}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          {!isOwn && (
            <button
              onClick={() => onSwipeReply(msg)}
              className="opacity-0 group-hover:opacity-100 tap-sm"
              style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--surface-2)', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s', flexShrink: 0 }}
            >
              <Reply size={13} />
            </button>
          )}

          <div style={{ position: 'relative' }}>
            <div
              style={{
                borderRadius: 18, overflow: 'hidden', position: 'relative',
                ...(isOwn
                  ? { background: 'var(--grad-brand)', color: '#fff', borderBottomRightRadius: isGroupedWithNext ? 18 : 5 }
                  : { background: 'var(--surface-2)', color: 'var(--text-primary)', borderBottomLeftRadius: isGroupedWithNext ? 18 : 5 }),
              }}
            >
              {isUploading && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 2,
                  background: 'rgba(0,0,0,0.28)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Loader2 size={16} className="animate-spin" color="#fff" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Sending…</span>
                </div>
              )}
              {/* Image / GIF */}
              {msg.media_url && (msg.media_type === 'image' || msg.media_type === 'gif') && (
                msg.view_once && !isViewOnceRevealed ? (
                  msg.viewed_at && !isOwn ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', color: 'var(--text-tertiary)' }}>
                      <Eye size={16} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Opened</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onRevealViewOnce(msg.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', color: isOwn ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)' }}
                    >
                      <Eye size={16} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {isOwn ? (msg.viewed_at ? 'Opened by them · tap to view' : 'Sent · tap to view') : 'Tap to view · disappears after'}
                      </span>
                    </button>
                  )
                ) : (
                  <img src={msg.media_url} alt="" style={{ display: 'block', width: '100%', maxHeight: 300, objectFit: 'cover', maxWidth: 260 }} />
                )
              )}

              {msg.media_url && msg.media_type === 'video' && (
                <video src={msg.media_url} controls style={{ display: 'block', width: '100%', maxHeight: 300, maxWidth: 260 }} />
              )}

              {msg.media_url && msg.media_type === 'audio' && (
                <VoiceBubble
                  msg={msg} isOwn={isOwn}
                  playing={playingAudio === msg.id}
                  progress={audioProgress} duration={audioDuration}
                  onToggle={() => onToggleAudio(msg.id, msg.media_url!)}
                  onSeek={f => onSeekAudio(msg.id, f)}
                />
              )}

              {msg.media_url && msg.media_type === 'file' && (
                <a href={msg.media_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', textDecoration: 'none', minWidth: 160 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(91,33,182,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileIcon size={17} color={isOwn ? '#fff' : 'var(--nia-violet)'} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{msg.file_name}</p>
                    <p style={{ fontSize: 11, opacity: 0.55, margin: 0 }}>Tap to open</p>
                  </div>
                </a>
              )}

              {msg.content && (
                <p style={{ padding: '8px 12px', fontSize: 14.5, lineHeight: 1.45, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>
              )}

              {(!isGroupedWithNext || msg.edited_at) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px 6px', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                  {msg.view_once && <Eye size={10} style={{ opacity: 0.5 }} />}
                  {msg.edited_at && <span style={{ fontSize: 10, opacity: 0.55 }}>edited</span>}
                  {!isGroupedWithNext && <span style={{ fontSize: 10, opacity: 0.55 }}>{timeAgo(msg.created_at)}</span>}
                  {isOwn && !isGroupedWithNext && (
                    isTemp
                      ? <Check size={11} style={{ opacity: 0.4 }} />
                      : msg.is_read
                        ? <CheckCheck size={11} color={isOwn ? 'rgba(255,255,255,0.8)' : 'var(--nia-violet)'} />
                        : <Check size={11} style={{ opacity: 0.55 }} />
                  )}
                </div>
              )}
            </div>

            {hasReactions && (
              <div
                key={Object.keys(reactionCounts).sort().join('-')}
                className="animate-pop"
                style={{
                  position: 'absolute', bottom: -12, [isOwn ? 'right' : 'left']: 6,
                  display: 'flex', gap: 2, background: 'var(--surface-1)',
                  border: '1px solid var(--border)', borderRadius: 10, padding: '3px 6px',
                  fontSize: 13, boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                } as React.CSSProperties}
              >
                {Object.entries(reactionCounts).map(([emoji, count]) => (
                  <span key={emoji}>{emoji}{count > 1 ? count : ''}</span>
                ))}
              </div>
            )}
          </div>

          {isOwn && (
            <button
              onClick={() => onSwipeReply(msg)}
              className="opacity-0 group-hover:opacity-100 tap-sm"
              style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--surface-2)', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s', flexShrink: 0 }}
            >
              <Reply size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function VoiceBubble({
  msg, isOwn, playing, progress, duration, onToggle, onSeek,
}: {
  msg: ChatMessage
  isOwn: boolean
  playing: boolean
  progress: number
  duration: number
  onToggle: () => void
  onSeek: (fraction: number) => void
}) {
  const bars = waveformBars(msg.id)
  const trackRef = useRef<HTMLDivElement>(null)
  const pct = duration > 0 ? Math.min(1, progress / duration) : 0
  const filledCount = Math.round(pct * bars.length)

  function handleTrackClick(e: React.MouseEvent) {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', minWidth: 190 }}>
      <button
        onClick={onToggle}
        style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, background: isOwn ? 'rgba(255,255,255,0.25)' : 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {playing ? <Pause size={14} color="white" /> : <Play size={14} color="white" style={{ marginLeft: 2 }} />}
      </button>
      <div style={{ flex: 1 }}>
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          style={{ display: 'flex', alignItems: 'center', gap: 2, height: 22, cursor: 'pointer' }}
        >
          {bars.map((h, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: 2, height: `${h * 100}%`,
              background: i < filledCount
                ? (isOwn ? '#fff' : 'var(--nia-violet)')
                : (isOwn ? 'rgba(255,255,255,0.35)' : 'var(--surface-3)'),
              transition: 'background 0.1s',
            }} />
          ))}
        </div>
        <span style={{ fontSize: 11, opacity: 0.65 }}>
          {duration > 0 ? fmtTime(playing || progress > 0 ? progress : duration) : 'Voice message'}
        </span>
      </div>
    </div>
  )
}