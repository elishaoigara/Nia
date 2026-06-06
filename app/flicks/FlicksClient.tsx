'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Heart, MessageCircle, Share2, Volume2, VolumeX, Play,
  X, Send, Loader2, ImagePlus, Eye, Check,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getFlag } from '@/lib/african-data'

export interface FlickPost {
  id: string
  content: string | null
  media_url: string
  created_at: string
  language: string | null
  profiles: { id: string; username: string; avatar_url: string | null; country: string | null } | null
  likes: { user_id: string }[]
  comments: { id: string }[]
}

interface FlicksClientProps {
  videos: FlickPost[]
  currentUserId: string
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

// ── Comment Sheet ─────────────────────────────────────────────────────────────
function CommentSheet({
  postId,
  currentUserId,
  initialCount,
  onClose,
  onCountChange,
}: {
  postId: string
  currentUserId: string
  initialCount: number
  onClose: () => void
  onCountChange: (n: number) => void
}) {
  const supabase = createClient()
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [visible, setVisible] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Animate in
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  // Load comments
  useEffect(() => {
    supabase
      .from('comments')
      .select('*, profiles:user_id (id, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setComments(data ?? [])
        setLoading(false)
        setTimeout(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
          inputRef.current?.focus()
        }, 200)
      })
  }, [postId]) // eslint-disable-line

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `comments/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      setMediaPreview({ url: data.publicUrl, type: file.type.startsWith('video') ? 'video' : 'image' })
    }
    setUploading(false)
    e.target.value = ''
  }

  async function submit() {
    if (!text.trim() && !mediaPreview) return
    setPosting(true)
    const payload: any = { post_id: postId, user_id: currentUserId }
    if (text.trim()) payload.content = text.trim()
    if (mediaPreview) { payload.media_url = mediaPreview.url; payload.media_type = mediaPreview.type }

    const { data, error } = await supabase
      .from('comments')
      .insert(payload)
      .select('*, profiles:user_id (id, username, avatar_url)')
      .single()

    if (!error && data) {
      const newComments = [...comments, data]
      setComments(newComments)
      const newCount = count + 1
      setCount(newCount)
      onCountChange(newCount) // sync back to FlickItem
      setText('')
      setMediaPreview(null)
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
      }, 100)
    }
    setPosting(false)
  }

  function dismiss() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={dismiss}
      />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          height: '72vh',
          background: 'rgba(13,12,11,0.98)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: 'none',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
          willChange: 'transform',
        }}
      >
        {/* Handle + header */}
        <div className="shrink-0 px-4 pt-3 pb-2">
          <div
            className="w-9 h-1 rounded-full mx-auto mb-3"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          />
          <div className="flex items-center justify-between">
            <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)', fontSize: 15 }}>
              {count > 0 ? `${count} comment${count !== 1 ? 's' : ''}` : 'Comments'}
            </span>
            <button
              onClick={dismiss}
              style={{
                width: 30, height: 30, borderRadius: '50%', border: 'none',
                background: 'rgba(255,255,255,0.08)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.1s',
              }}
            >
              <X size={15} color="rgba(255,255,255,0.7)" />
            </button>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

        {/* Comment list */}
        <div ref={listRef} className="flex-1 overflow-y-auto" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 32 }}>
              <Loader2 size={22} className="animate-spin" style={{ color: 'rgba(255,255,255,0.35)' }} />
            </div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 48 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                No comments yet. Be the first!
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {/* Avatar */}
                <Link href={`/profile/${c.profiles?.id}`} style={{ flexShrink: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
                    background: 'var(--grad-brand)',
                    border: '1.5px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: 11,
                  }}>
                    {c.profiles?.avatar_url
                      ? <img src={c.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : c.profiles?.username?.[0]?.toUpperCase()
                    }
                  </div>
                </Link>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name bubble */}
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '0 12px 12px 12px',
                    padding: '8px 12px',
                    display: 'inline-block',
                    maxWidth: '100%',
                  }}>
                    <Link
                      href={`/profile/${c.profiles?.id}`}
                      style={{ fontWeight: 700, fontSize: 12, color: 'var(--nia-accent-soft)', marginRight: 6, textDecoration: 'none' }}
                    >
                      @{c.profiles?.username}
                    </Link>
                    {c.content && (
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>{c.content}</span>
                    )}
                  </div>

                  {/* Media in comment */}
                  {c.media_url && (
                    <div style={{ marginTop: 6 }}>
                      {c.media_type === 'video'
                        ? <video src={c.media_url} controls style={{ borderRadius: 12, maxHeight: 140, border: '1px solid rgba(255,255,255,0.1)' }} />
                        : <img src={c.media_url} alt="" style={{ borderRadius: 12, maxHeight: 140, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                      }
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 4, paddingLeft: 2 }}>
                    {timeAgo(c.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input area */}
        <div
          className="shrink-0"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '10px 12px',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Media preview */}
          {mediaPreview && (
            <div style={{ position: 'relative', display: 'inline-block', marginLeft: 4 }}>
              {mediaPreview.type === 'video'
                ? <video src={mediaPreview.url} style={{ height: 64, borderRadius: 10, objectFit: 'cover' }} muted />
                : <img src={mediaPreview.url} alt="" style={{ height: 64, borderRadius: 10, objectFit: 'cover' }} />
              }
              <button
                onClick={() => setMediaPreview(null)}
                style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 20, height: 20, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(0,0,0,0.85)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={10} color="white" />
              </button>
            </div>
          )}

          {/* Input row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            {/* Photo attach */}
            <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFile} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                background: 'rgba(255,255,255,0.08)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'transform 0.1s',
              }}
              title="Attach photo or video"
            >
              {uploading
                ? <Loader2 size={15} className="animate-spin" color="rgba(255,255,255,0.6)" />
                : <ImagePlus size={15} color="rgba(255,255,255,0.6)" />
              }
            </button>

            {/* Text input */}
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
              }}
              placeholder="Add a comment…"
              rows={1}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: 20, outline: 'none',
                resize: 'none', fontSize: 13, fontFamily: 'inherit',
                background: 'rgba(255,255,255,0.07)',
                color: 'white',
                border: '1.5px solid rgba(255,255,255,0.09)',
                caretColor: 'var(--nia-accent-soft)',
                minHeight: 36, maxHeight: 80,
                lineHeight: 1.5,
              }}
            />

            {/* Send */}
            <button
              onClick={submit}
              disabled={(!text.trim() && !mediaPreview) || posting}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                background: 'var(--grad-brand)', cursor: 'pointer', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, opacity: (!text.trim() && !mediaPreview) || posting ? 0.4 : 1,
                transition: 'opacity 0.15s, transform 0.1s',
              }}
            >
              {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Flicks Component ─────────────────────────────────────────────────────
export default function NiaFlicksClient({ videos, currentUserId }: FlicksClientProps) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [muted, setMuted] = useState(false)
  const [commentSheet, setCommentSheet] = useState<{ postId: string; count: number; flickIdx: number } | null>(null)
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(videos.map(v => [v.id, v.comments?.length ?? 0]))
  )
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function onScroll() {
      const idx = Math.round(el!.scrollTop / window.innerHeight)
      setActiveIdx(idx)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when sheet open
  useEffect(() => {
    document.body.style.overflow = commentSheet ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [commentSheet])

  const handleOpenComments = useCallback((postId: string, count: number, flickIdx: number) => {
    setCommentSheet({ postId, count, flickIdx })
  }, [])

  const handleCommentCountChange = useCallback((postId: string, newCount: number) => {
    setCommentCounts(prev => ({ ...prev, [postId]: newCount }))
  }, [])

  if (videos.length === 0) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0D0C0B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '0 32px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎬</div>
          <p style={{ color: 'white', fontWeight: 800, fontSize: 20, marginBottom: 6 }}>No flicks yet</p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 24 }}>Be the first to share a flick!</p>
          <Link
            href="/"
            style={{
              display: 'inline-block', padding: '10px 28px', borderRadius: 20,
              background: 'var(--grad-brand)', color: 'white', fontWeight: 700, fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Go to feed
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      {/* Header overlay */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
          height: 60,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
          pointerEvents: 'none',
        }}
      >
        <Link href="/" style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 10,
            background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: 13,
          }}>N</div>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px' }}>Flicks</span>
        </Link>
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(8px)',
          padding: '4px 10px', borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
        }}>
          {activeIdx + 1} / {videos.length}
        </span>
      </div>

      {/* Scrollable reel container */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute', inset: 0,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as React.CSSProperties}
      >
        {videos.map((video, i) => (
          <FlickItem
            key={video.id}
            video={video}
            isActive={i === activeIdx}
            muted={muted}
            onToggleMute={() => setMuted(m => !m)}
            currentUserId={currentUserId}
            commentCount={commentCounts[video.id] ?? 0}
            onOpenComments={(postId, count) => handleOpenComments(postId, count, i)}
          />
        ))}
      </div>

      {/* Comment sheet */}
      {commentSheet && (
        <CommentSheet
          postId={commentSheet.postId}
          currentUserId={currentUserId}
          initialCount={commentSheet.count}
          onClose={() => setCommentSheet(null)}
          onCountChange={(n) => handleCommentCountChange(commentSheet.postId, n)}
        />
      )}
    </div>
  )
}

// ── Single Flick Item ─────────────────────────────────────────────────────────
function FlickItem({
  video, isActive, muted, onToggleMute, currentUserId, commentCount, onOpenComments,
}: {
  video: FlickPost
  isActive: boolean
  muted: boolean
  onToggleMute: () => void
  currentUserId: string
  commentCount: number
  onOpenComments: (postId: string, count: number) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const viewTracked = useRef(false)
  const supabase = createClient()

  const [playing, setPlaying] = useState(false)
  const [liked, setLiked] = useState(video.likes?.some(l => l.user_id === currentUserId) ?? false)
  const [likeCount, setLikeCount] = useState(video.likes?.length ?? 0)
  const [progress, setProgress] = useState(0)
  const [viewCount, setViewCount] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch real view count on mount
  useEffect(() => {
    supabase
      .from('post_views')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', video.id)
      .then(({ count }) => setViewCount(count ?? 0))
  }, [video.id]) // eslint-disable-line

  // Track view once per active session
  useEffect(() => {
    if (isActive && !viewTracked.current && currentUserId) {
      viewTracked.current = true
      supabase
        .from('post_views')
        .insert({ post_id: video.id, user_id: currentUserId })
        .then(({ error }) => {
          if (!error) setViewCount(c => (c ?? 0) + 1)
        })
    }
    if (!isActive) {
      // Reset so re-entry counts again only if navigated away fully
      // (keep viewTracked true so same session doesn't double-count)
    }
  }, [isActive]) // eslint-disable-line

  // Play / pause based on active state
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (isActive) {
      v.currentTime = 0
      v.play().then(() => setPlaying(true)).catch(() => { })
    } else {
      v.pause()
      setPlaying(false)
      setProgress(0)
    }
  }, [isActive])

  // Sync mute
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play().then(() => setPlaying(true)).catch(() => { }) }
    else { v.pause(); setPlaying(false) }
  }

  async function toggleLike() {
    if (liked) {
      setLiked(false); setLikeCount(c => c - 1)
      await supabase.from('likes').delete().eq('post_id', video.id).eq('user_id', currentUserId)
    } else {
      setLiked(true); setLikeCount(c => c + 1)
      await supabase.from('likes').insert({ post_id: video.id, user_id: currentUserId })
    }
  }

  async function share() {
    const url = `${window.location.origin}/posts/${video.id}`
    if (navigator.share) {
      await navigator.share({ url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const profile = video.profiles

  return (
    <div
      style={{
        position: 'relative', width: '100%',
        height: '100dvh',
        scrollSnapAlign: 'start', scrollSnapStop: 'always',
        background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={video.media_url}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        loop playsInline preload={isActive ? 'auto' : 'none'}
        onTimeUpdate={() => {
          const v = videoRef.current
          if (v && v.duration) setProgress((v.currentTime / v.duration) * 100)
        }}
        onClick={togglePlay}
      />

      {/* Cinematic gradient */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.2) 100%)',
        }}
      />

      {/* Pause overlay */}
      {!playing && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid rgba(255,255,255,0.15)',
          }}>
            <Play size={26} fill="white" color="white" style={{ marginLeft: 4 }} />
          </div>
        </div>
      )}

      {/* ── Right action rail ───────────────────────────── */}
      <div style={{
        position: 'absolute', right: 12, bottom: 100,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        zIndex: 10,
      }}>
        {/* Avatar */}
        <Link href={`/profile/${profile?.id}`} style={{ display: 'block' }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%', overflow: 'hidden',
            border: '2px solid white',
            background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: 14,
          }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : profile?.username?.[0]?.toUpperCase() ?? '?'
            }
          </div>
        </Link>

        {/* Like */}
        <ActionBtn
          onClick={toggleLike}
          icon={<Heart size={22} fill={liked ? '#ff4d6d' : 'none'} color={liked ? '#ff4d6d' : 'white'} strokeWidth={1.8} />}
          label={likeCount > 0 ? String(likeCount) : ''}
          active={liked}
        />

        {/* Comments */}
        <ActionBtn
          onClick={() => onOpenComments(video.id, commentCount)}
          icon={<MessageCircle size={22} color="white" strokeWidth={1.8} />}
          label={commentCount > 0 ? String(commentCount) : ''}
        />

        {/* Views */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Eye size={19} color="rgba(255,255,255,0.85)" />
          </div>
          <span style={{ color: 'white', fontSize: 11, fontWeight: 700, minHeight: 14, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
            {viewCount !== null && viewCount > 0 ? (viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount) : ''}
          </span>
        </div>

        {/* Share */}
        <ActionBtn
          onClick={share}
          icon={copied ? <Check size={20} color="white" /> : <Share2 size={20} color="white" strokeWidth={1.8} />}
          label={copied ? 'Copied!' : 'Share'}
        />

        {/* Mute */}
        <button
          onClick={onToggleMute}
          style={{
            width: 42, height: 42, borderRadius: '50%', cursor: 'pointer',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.1s',
          } as React.CSSProperties}
        >
          {muted
            ? <VolumeX size={19} color="rgba(255,255,255,0.85)" strokeWidth={1.8} />
            : <Volume2 size={19} color="rgba(255,255,255,0.85)" strokeWidth={1.8} />
          }
        </button>
      </div>

      {/* ── Bottom info ─────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 56, left: 0, right: 68,
        padding: '0 16px',
      }}>
        <Link href={`/profile/${profile?.id}`} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 6, textDecoration: 'none',
        }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            @{profile?.username ?? 'unknown'}
          </span>
          {profile?.country && (
            <span style={{ fontSize: 15, lineHeight: 1 }}>{getFlag(profile.country)}</span>
          )}
        </Link>
        {video.content && (
          <p style={{
            color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 1.55,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', textShadow: '0 1px 4px rgba(0,0,0,0.6)',
            margin: 0,
          } as React.CSSProperties}>
            {video.content}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2.5, background: 'rgba(255,255,255,0.15)',
      }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'var(--nia-accent-soft)',
          transition: 'width 0.1s linear',
          boxShadow: '0 0 6px var(--nia-accent-soft)',
        }} />
      </div>
    </div>
  )
}

// ── Reusable action button ────────────────────────────────────────────────────
function ActionBtn({
  onClick, icon, label, active,
}: {
  onClick: () => void
  icon: React.ReactNode
  label?: string
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        border: 'none', background: 'none', cursor: 'pointer',
        padding: 0, transition: 'transform 0.12s',
      }}
      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.88)')}
      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.88)')}
      onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{
        width: 42, height: 42, borderRadius: '50%',
        background: active ? 'rgba(255,77,109,0.18)' : 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(6px)',
        border: `1px solid ${active ? 'rgba(255,77,109,0.3)' : 'rgba(255,255,255,0.12)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      {label !== undefined && (
        <span style={{
          color: 'white', fontSize: 11, fontWeight: 700,
          minHeight: 14, textShadow: '0 1px 3px rgba(0,0,0,0.6)',
        }}>
          {label}
        </span>
      )}
    </button>
  )
}