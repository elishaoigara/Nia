'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Heart, MessageCircle, Share2, Volume2, VolumeX, Play,
  X, Send, Loader2, ImagePlus, Eye,
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

// ── TikTok-style Comment Sheet ────────────────────────────────────────────────
function CommentSheet({
  postId,
  currentUserId,
  initialCount,
  onClose,
}: {
  postId: string
  currentUserId: string
  initialCount: number
  onClose: () => void
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
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifQuery, setGifQuery] = useState('')
  const [gifResults, setGifResults] = useState<{ url: string; preview: string }[]>([])
  const [gifLoading, setGifLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const gifFileRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPm_sspTcFcjHFS4'
  const FALLBACK_GIFS = [
    { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', preview: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy_s.gif' },
    { url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy_s.gif' },
    { url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', preview: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy_s.gif' },
    { url: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif', preview: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy_s.gif' },
  ]

  async function searchGifs(q: string) {
    setGifQuery(q)
    setGifLoading(true)
    try {
      const endpoint = q.trim()
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=12&media_filter=gif,tinygif`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=12&media_filter=gif,tinygif`
      const res = await fetch(endpoint)
      if (!res.ok) { setGifResults(FALLBACK_GIFS); return }
      const data = await res.json()
      const results = (data.results ?? []).map((r: any) => ({
        url: r.media_formats?.gif?.url ?? r.media_formats?.tinygif?.url ?? '',
        preview: r.media_formats?.tinygif?.url ?? r.media_formats?.gif?.url ?? '',
      })).filter((g: any) => g.url)
      setGifResults(results.length ? results : FALLBACK_GIFS)
    } catch {
      setGifResults(FALLBACK_GIFS)
    } finally {
      setGifLoading(false)
    }
  }

  function openGifPicker() {
    setShowGifPicker(true)
    setGifQuery('')
    searchGifs('')
  }

  function pickGif(url: string) {
    setMediaPreview({ url, type: 'gif' })
    setShowGifPicker(false)
  }

  async function handleGifUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `comments/${Date.now()}.gif`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true, contentType: 'image/gif' })
    if (!error) {
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      setMediaPreview({ url: data.publicUrl, type: 'gif' })
    }
    setUploading(false)
    e.target.value = ''
  }

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

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
  }, [postId])

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
      setComments((prev) => [...prev, data])
      setCount((c) => c + 1)
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
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={dismiss}
      />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          height: '72vh',
          background: 'rgba(18,18,24,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '24px 24px 0 0',
          border: '1px solid rgba(255,255,255,0.08)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
          willChange: 'transform',
        }}
      >
        {/* Handle + header */}
        <div className="shrink-0 px-4 pt-3 pb-2">
          <div
            className="w-10 h-1 rounded-full mx-auto mb-3"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          />
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-sm">
              {count > 0 ? `${count} comment${count !== 1 ? 's' : ''}` : 'Comments'}
            </span>
            <button
              onClick={dismiss}
              className="w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-transform"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <X size={16} color="white" />
            </button>
          </div>
        </div>

        <div className="w-full h-px shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />

        {/* Comment list */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="flex justify-center pt-8">
              <Loader2 size={22} className="animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center pt-10 space-y-2">
              <div className="text-3xl">💬</div>
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                No comments yet. Be first!
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 items-start">
                {/* Avatar */}
                <Link href={`/profile/${c.profiles?.id}`} className="shrink-0">
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs"
                    style={{ background: 'var(--grad-brand)', border: '1.5px solid rgba(255,255,255,0.15)' }}
                  >
                    {c.profiles?.avatar_url ? (
                      <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      c.profiles?.username?.[0]?.toUpperCase()
                    )}
                  </div>
                </Link>

                {/* Body */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-sm">
                    <Link
                      href={`/profile/${c.profiles?.id}`}
                      className="font-bold mr-2"
                      style={{ color: 'rgba(255,255,255,0.9)' }}
                    >
                      @{c.profiles?.username}
                    </Link>
                    {c.content && (
                      <span style={{ color: 'rgba(255,255,255,0.75)' }}>{c.content}</span>
                    )}
                  </div>

                  {/* Media in comment */}
                  {c.media_url && (
                    <div>
                      {c.media_type === 'video' ? (
                        <video
                          src={c.media_url}
                          controls
                          className="rounded-xl max-h-40 max-w-45"
                          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      ) : (
                        <img
                          src={c.media_url}
                          alt=""
                          className="rounded-xl max-h-40 max-w-45 object-cover"
                          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      )}
                    </div>
                  )}

                  <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {timeAgo(c.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input area */}
        <div
          className="shrink-0 px-3 py-3 space-y-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* ── GIF Picker panel ────────────────────────────── */}
          {showGifPicker && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {/* Search + upload row */}
              <div className="flex gap-2 p-2">
                <input
                  value={gifQuery}
                  onChange={(e) => searchGifs(e.target.value)}
                  placeholder="Search GIFs…"
                  autoFocus
                  className="flex-1 px-3 py-1.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'white', caretColor: 'var(--nia-violet)' }}
                />
                {/* Upload own GIF */}
                <input ref={gifFileRef} type="file" accept="image/gif" className="hidden" onChange={handleGifUpload} />
                <button
                  onClick={() => gifFileRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 active:scale-95 transition-transform"
                  style={{ background: 'rgba(168,85,247,0.25)', color: 'var(--nia-violet)', border: '1px solid rgba(168,85,247,0.3)' }}
                >
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : '+ Upload'}
                </button>
              </div>

              {/* Grid */}
              {gifLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 p-2 max-h-52 overflow-y-auto">
                  {gifResults.map((g, i) => (
                    <button
                      key={i}
                      onClick={() => pickGif(g.url)}
                      className="relative rounded-xl overflow-hidden active:scale-95 transition-transform"
                      style={{ aspectRatio: '1/1' }}
                    >
                      <img src={g.preview} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <div
                        className="absolute bottom-1 right-1 text-[8px] font-black px-1 rounded"
                        style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
                      >
                        GIF
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Media preview */}
          {mediaPreview && (
            <div className="relative inline-block ml-1">
              {mediaPreview.type === 'video' ? (
                <video src={mediaPreview.url} className="h-16 rounded-xl object-cover" muted />
              ) : (
                <img src={mediaPreview.url} alt="" className="h-16 rounded-xl object-cover" />
              )}
              <button
                onClick={() => setMediaPreview(null)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <X size={10} color="white" />
              </button>
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2">
            {/* Photo/Video */}
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
            <button
              onClick={() => { setShowGifPicker(false); fileRef.current?.click() }}
              disabled={uploading}
              className="w-9 h-9 flex items-center justify-center rounded-full shrink-0 active:scale-90 transition-transform"
              style={{ background: 'rgba(255,255,255,0.1)' }}
              title="Photo or video"
            >
              {uploading
                ? <Loader2 size={15} className="animate-spin" color="white" />
                : <ImagePlus size={15} color="rgba(255,255,255,0.7)" />
              }
            </button>

            {/* GIF toggle */}
            <button
              onClick={() => showGifPicker ? setShowGifPicker(false) : openGifPicker()}
              className="w-9 h-9 flex items-center justify-center rounded-full shrink-0 text-[10px] font-black active:scale-90 transition-transform"
              style={{
                background: showGifPicker ? 'var(--nia-violet)' : 'rgba(255,255,255,0.1)',
                color: showGifPicker ? 'white' : 'rgba(255,255,255,0.7)',
              }}
            >
              GIF
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
              className="flex-1 px-3 py-2 rounded-2xl text-sm outline-none resize-none"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1.5px solid rgba(255,255,255,0.1)',
                caretColor: 'var(--nia-violet)',
                minHeight: '36px',
                maxHeight: '80px',
              }}
            />

            {/* Send */}
            <button
              onClick={submit}
              disabled={(!text.trim() && !mediaPreview) || posting}
              className="w-9 h-9 flex items-center justify-center rounded-full text-white transition-all active:scale-90 disabled:opacity-40 shrink-0"
              style={{ background: 'var(--grad-brand)' }}
            >
              {posting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Reels Component ──────────────────────────────────────────────────────
export default function NiaFlicksClient({ videos, currentUserId }: FlicksClientProps) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [muted, setMuted] = useState(false)
  const [commentSheet, setCommentSheet] = useState<{ postId: string; count: number } | null>(null)
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

  // Prevent body scroll while sheet is open
  useEffect(() => {
    if (commentSheet) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [commentSheet])

  if (videos.length === 0) {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ background: '#000' }}>
        <div className="flex items-center justify-between px-4" style={{ height: '56px', background: 'rgba(0,0,0,0.8)' }}>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: 'var(--grad-brand)' }}>N</div>
            <span className="text-white font-extrabold text-lg tracking-tight">Nia</span>
          </Link>
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>🎬 Flicks</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 px-8">
            <div className="text-5xl">🎬</div>
            <p className="text-white font-bold text-lg">No flicks yet</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Be the first to share a flick on Nia!</p>
            <Link href="/" className="inline-block mt-4 px-6 py-2.5 rounded-2xl text-sm font-bold text-white" style={{ background: 'var(--grad-brand)' }}>
              Go to feed
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0" style={{ background: '#000' }}>
      {/* Header */}
      <div
        className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
        style={{ height: '56px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)', pointerEvents: 'none' }}
      >
        <Link href="/" className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: 'var(--grad-brand)' }}>N</div>
          <span className="text-white font-extrabold text-lg tracking-tight">Nia</span>
        </Link>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', pointerEvents: 'none' }}
        >
          🎬 Flicks
        </span>
      </div>

      {/* Scrollable reels */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-y-scroll"
        style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {videos.map((video, i) => (
          <FlickItem
            key={video.id}
            video={video}
            isActive={i === activeIdx}
            muted={muted}
            onToggleMute={() => setMuted(m => !m)}
            currentUserId={currentUserId}
            onOpenComments={(postId, count) => setCommentSheet({ postId, count })}
          />
        ))}
      </div>

      {/* TikTok comment sheet */}
      {commentSheet && (
        <CommentSheet
          postId={commentSheet.postId}
          currentUserId={currentUserId}
          initialCount={commentSheet.count}
          onClose={() => setCommentSheet(null)}
        />
      )}
    </div>
  )
}

// ── Single Reel Item ──────────────────────────────────────────────────────────
function FlickItem({
  video, isActive, muted, onToggleMute, currentUserId, onOpenComments,
}: {
  video: FlickPost
  isActive: boolean
  muted: boolean
  onToggleMute: () => void
  currentUserId: string
  onOpenComments: (postId: string, count: number) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const viewTracked = useRef(false)
  const supabase = createClient()
  const [playing, setPlaying] = useState(false)
  const [liked, setLiked] = useState(video.likes?.some(l => l.user_id === currentUserId) ?? false)
  const [likeCount, setLikeCount] = useState(video.likes?.length ?? 0)
  const [progress, setProgress] = useState(0)
  const [commentCount, setCommentCount] = useState(video.comments?.length ?? 0)
  const [viewCount, setViewCount] = useState(0)

  // Track view once when this flick becomes the active card
  useEffect(() => {
    if (isActive && !viewTracked.current && currentUserId) {
      viewTracked.current = true
      supabase
        .from('post_views')
        .insert({ post_id: video.id, user_id: currentUserId })
        .then(({ error }) => { if (!error) setViewCount(c => c + 1) })
    }
  }, [isActive])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (isActive) {
      v.currentTime = 0
      v.play().then(() => setPlaying(true)).catch(() => {})
    } else {
      v.pause()
      setPlaying(false)
    }
  }, [isActive])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play().then(() => setPlaying(true)).catch(() => {}); }
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
    if (navigator.share) { await navigator.share({ url }) }
    else { await navigator.clipboard.writeText(url) }
  }

  const profile = video.profiles

  return (
    <div
      className="relative w-full flex items-center justify-center"
      style={{ height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always', background: '#000' }}
    >
      <video
        ref={videoRef}
        src={video.media_url}
        className="absolute inset-0 w-full h-full object-cover"
        loop playsInline preload={isActive ? 'auto' : 'none'}
        onTimeUpdate={() => {
          const v = videoRef.current
          if (v && v.duration) setProgress((v.currentTime / v.duration) * 100)
        }}
        onClick={togglePlay}
      />

      {/* Gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%, rgba(0,0,0,0.15) 100%)' }}
      />

      {/* Pause indicator */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}>
            <Play size={28} fill="white" color="white" style={{ marginLeft: 4 }} />
          </div>
        </div>
      )}

      {/* ── Right action rail ─────────────────────────────── */}
      <div className="absolute right-3 sm:right-8 bottom-24 sm:bottom-28 flex flex-col items-center gap-4 sm:gap-5">
        {/* Avatar */}
        <Link href={`/profile/${profile?.id}`}>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden" style={{ border: '2px solid white' }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--grad-brand)' }}>
                {profile?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
        </Link>

        {/* Like */}
        <button onClick={toggleLike} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <Heart size={20} fill={liked ? '#ff4d6d' : 'none'} color={liked ? '#ff4d6d' : 'white'} strokeWidth={1.8} />
          </div>
          <span className="text-white text-xs font-bold">{likeCount}</span>
        </button>

        {/* Comments — now opens sheet instead of navigating */}
        <button
          onClick={() => onOpenComments(video.id, commentCount)}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <MessageCircle size={20} color="white" strokeWidth={1.8} />
          </div>
          <span className="text-white text-xs font-bold">{commentCount}</span>
        </button>

        {/* View count */}
        <div className="flex flex-col items-center gap-1 opacity-80">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <Eye size={18} className="text-white" />
          </div>
          <span className="text-white text-xs font-bold">{viewCount > 0 ? viewCount.toLocaleString() : ''}</span>
        </div>

        {/* Share */}
        <button onClick={share} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <Share2 size={18} color="white" strokeWidth={1.8} />
          </div>
          <span className="text-white text-xs font-bold">Share</span>
        </button>

        {/* Mute */}
        <button onClick={onToggleMute} className="active:scale-90 transition-transform">
          <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
            {muted ? <VolumeX size={18} color="white" strokeWidth={1.8} /> : <Volume2 size={18} color="white" strokeWidth={1.8} />}
          </div>
        </button>
      </div>

      {/* ── Bottom info ────────────────────────────────────── */}
      <div className="absolute bottom-16 sm:bottom-20 left-0 right-16 sm:right-24 px-4">
        <Link href={`/profile/${profile?.id}`} className="flex items-center gap-2 mb-1.5">
          <span className="text-white font-bold text-sm">@{profile?.username ?? 'unknown'}</span>
          {profile?.country && <span className="text-base leading-none">{getFlag(profile.country)}</span>}
        </Link>
        {video.content && (
          <p className="text-white text-sm leading-snug line-clamp-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
            {video.content}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-10 sm:bottom-12 left-0 right-0 h-0.5" style={{ background: 'rgba(255,255,255,0.2)' }}>
        <div className="h-full" style={{ width: `${progress}%`, background: 'white', transition: 'width 0.1s linear' }} />
      </div>
    </div>
  )
}