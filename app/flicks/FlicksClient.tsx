'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Heart, MessageCircle, Share2, Volume2, VolumeX, Play,
  X, Send, Loader2, ImagePlus, Eye, Check, AlertCircle, RotateCcw,
  Search, ArrowLeft, Hash,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getFlag } from '@/lib/african-data'
import { VIDEO_CATEGORIES, getCategoryMeta } from '@/lib/video-categories'

export interface FlickPost {
  id: string
  user_id?: string
  content: string | null
  media_url: string
  /** Optional poster frame — add a `thumbnail_url` column + generate it at upload time to kill the black-flash-on-load. Falls back gracefully if absent. */
  thumbnail_url?: string | null
  created_at: string
  language: string | null
  video_duration?: number | null
  category?: string | null
  profiles: { id: string; username: string; avatar_url: string | null; country: string | null } | null
  likes: { user_id: string }[]
  comments: { id: string }[]
  /** Join this in the server query (`post_views (id)`) so we don't fire a separate count query per video on mount. */
  post_views?: { id: string }[]
}

interface FlicksClientProps {
  shorts: FlickPost[]
  longs: FlickPost[]
  currentUserId: string
}

// How many videos on either side of the active one get a real <video> element.
// Everything outside this window renders a lightweight poster placeholder instead —
// this is the fix for mid/low-end Android devices choking after scrolling a while.
const RENDER_WINDOW = 1
const DOUBLE_TAP_MS = 280

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function formatDuration(sec?: number | null) {
  if (!sec || sec <= 0) return ''
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Detects Data Saver / slow connections (common on African mobile networks) so we
// can dial back preloading instead of burning the user's data bundle in the background.
function useSlowConnection() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const conn = (navigator as any).connection
    if (!conn) return
    function update() {
      setSlow(!!conn.saveData || ['slow-2g', '2g', '3g'].includes(conn.effectiveType))
    }
    update()
    conn.addEventListener?.('change', update)
    return () => conn.removeEventListener?.('change', update)
  }, [])
  return slow
}

const HEART_BURST_KEYFRAMES = `
@keyframes niaHeartBurst {
  0% { transform: scale(0.3); opacity: 0; }
  25% { transform: scale(1.15); opacity: 1; }
  45% { transform: scale(0.95); opacity: 1; }
  100% { transform: scale(1.05); opacity: 0; }
}
@keyframes niaSoundHintFade {
  0%, 70% { opacity: 1; }
  100% { opacity: 0; }
}
`

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
          // Don't force-focus on mobile — it pops the keyboard immediately and covers
          // the comment list before the user has even read anything.
          if (window.matchMedia?.('(pointer: fine)').matches) {
            inputRef.current?.focus()
          }
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
                resize: 'none', fontSize: 16, fontFamily: 'inherit', // 16px prevents iOS Safari auto-zoom on focus
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
export default function NiaFlicksClient({ shorts, longs, currentUserId }: FlicksClientProps) {
  const [tab, setTab] = useState<'short' | 'long'>('short')
  const [activeIdx, setActiveIdx] = useState(0)
  // Start muted: iOS/most mobile browsers silently reject unmuted autoplay, which
  // meant the very first video often never actually started playing. Muted-by-default
  // + a "tap for sound" hint is the standard short-video pattern for a reason.
  const [muted, setMuted] = useState(true)
  const [commentSheet, setCommentSheet] = useState<{ postId: string; count: number; flickIdx: number } | null>(null)
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    () => Object.fromEntries([...shorts, ...longs].map(v => [v.id, v.comments?.length ?? 0]))
  )
  // Renamed from `openLong` — this now also opens when a *short* flick is picked
  // from search, since the detail player works fine for any duration. Previously
  // this only rendered inside the "long" tab branch, so selecting a search result
  // while on the Flicks (short) tab silently did nothing.
  const [openDetail, setOpenDetail] = useState<FlickPost | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const slowConnection = useSlowConnection()

  useEffect(() => {
    const el = containerRef.current
    if (!el || tab !== 'short') return
    let raf = 0
    function onScroll() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const idx = Math.round(el!.scrollTop / window.innerHeight)
        setActiveIdx(idx)
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [tab])

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

  // ── Tab toggle (shared header) ──────────────────────────────────
  const TabToggle = (
    <div
      style={{
        position: 'absolute', top: 'calc(10px + env(safe-area-inset-top, 0px))', left: 0, right: 0, zIndex: 60,
        display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      }}
    >
      <div style={{
        pointerEvents: 'auto',
        display: 'flex', gap: 4,
        background: 'rgba(20,18,17,0.55)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, padding: 3,
      }}>
        {(['short', 'long'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setActiveIdx(0) }}
            style={{
              border: 'none', cursor: 'pointer',
              padding: '8px 16px', borderRadius: 16, // 8px vertical = comfortably >=44px tap target with line-height
              fontSize: 13, fontWeight: 700,
              background: tab === t ? 'var(--grad-brand)' : 'transparent',
              color: tab === t ? 'white' : 'rgba(255,255,255,0.6)',
              transition: 'background 0.15s, color 0.15s',
              touchAction: 'manipulation',
            }}
          >
            {t === 'short' ? 'Flicks' : 'Long Flicks'}
          </button>
        ))}
      </div>
    </div>
  )

  // ── Search button (shared header, opens the video-only search overlay) ──
  const SearchButton = (
    <button
      onClick={() => setSearchOpen(true)}
      style={{
        position: 'absolute', top: 'calc(10px + env(safe-area-inset-top, 0px))', right: 14, zIndex: 60,
        width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(20,18,17,0.55)', backdropFilter: 'blur(10px)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation',
      }}
      title="Search flicks"
    >
      <Search size={16} color="rgba(255,255,255,0.85)" />
    </button>
  )


  // ── Empty state ──────────────────────────────────────────────────
  if (shorts.length === 0 && longs.length === 0) {
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

  // ── Long Flicks tab ───────────────────────────────────────────────
  if (tab === 'long') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#0D0C0B',
        overflowY: 'auto', overscrollBehaviorY: 'contain',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {TabToggle}
        {SearchButton}
        <LongFlicksGrid
          videos={longs}
          onOpen={setOpenDetail}
        />
        {openDetail && (
          <LongFlickPlayer
            video={openDetail}
            currentUserId={currentUserId}
            commentCount={commentCounts[openDetail.id] ?? 0}
            onOpenComments={(postId, count) => handleOpenComments(postId, count, -1)}
            onClose={() => setOpenDetail(null)}
          />
        )}
        {searchOpen && (
          <SearchOverlay
            onClose={() => setSearchOpen(false)}
            onSelect={(v) => { setOpenDetail(v); setSearchOpen(false) }}
          />
        )}
        {commentSheet && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
            <CommentSheet
              postId={commentSheet.postId}
              currentUserId={currentUserId}
              initialCount={commentSheet.count}
              onClose={() => setCommentSheet(null)}
              onCountChange={(n) => handleCommentCountChange(commentSheet.postId, n)}
            />
          </div>
        )}
      </div>
    )
  }

  // ── Flicks (shorts) tab ───────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <style>{HEART_BURST_KEYFRAMES}</style>

      {/* Header overlay */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
          height: 'calc(60px + env(safe-area-inset-top, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
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
        </Link>
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation',
            }}
            title="Search flicks"
          >
            <Search size={14} color="rgba(255,255,255,0.85)" />
          </button>
        </div>
      </div>

      {TabToggle}

      {searchOpen && (
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          onSelect={(v) => { setOpenDetail(v); setSearchOpen(false) }}
        />
      )}

      {/* Detail player for a search result picked while on the short-flicks tab —
          this was previously only rendered inside the "long" tab branch, so it
          silently did nothing if you searched from here. */}
      {openDetail && (
        <LongFlickPlayer
          video={openDetail}
          currentUserId={currentUserId}
          commentCount={commentCounts[openDetail.id] ?? 0}
          onOpenComments={(postId, count) => handleOpenComments(postId, count, -1)}
          onClose={() => setOpenDetail(null)}
        />
      )}

      {shorts.length === 0 ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>No short flicks yet — check Long Flicks!</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          style={{
            position: 'absolute', inset: 0,
            overflowY: 'scroll',
            scrollSnapType: 'y mandatory',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain', // stops iOS rubber-band from bleeding into pull-to-refresh
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties}
        >
          {shorts.map((video, i) => (
            <FlickItem
              key={video.id}
              video={video}
              isActive={i === activeIdx}
              shouldMount={Math.abs(i - activeIdx) <= RENDER_WINDOW}
              slowConnection={slowConnection}
              muted={muted}
              onToggleMute={() => setMuted(m => !m)}
              currentUserId={currentUserId}
              commentCount={commentCounts[video.id] ?? 0}
              onOpenComments={(postId, count) => handleOpenComments(postId, count, i)}
              showSoundHint={i === 0 && muted}
            />
          ))}
        </div>
      )}

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

// ── Long Flicks: topic grid + category chips ──────────────────────────────────
function LongFlicksGrid({ videos, onOpen }: { videos: FlickPost[]; onOpen: (v: FlickPost) => void }) {
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const counts = videos.reduce((acc: Record<string, number>, v) => {
    const cat = v.category ?? 'other'
    acc[cat] = (acc[cat] ?? 0) + 1
    return acc
  }, {})

  const chips = [{ id: 'all', label: 'All', emoji: '🎬' }, ...VIDEO_CATEGORIES]
    .filter(c => c.id === 'all' || (counts[c.id] ?? 0) > 0)

  const filtered = activeCategory === 'all'
    ? videos
    : videos.filter(v => (v.category ?? 'other') === activeCategory)

  if (videos.length === 0) {
    return (
      <div style={{ paddingTop: 120, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🎞️</div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>No long flicks yet. Share something longer!</p>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 60 }}>
      {/* Category chip bar — pinned under the tab header, horizontally scrollable */}
      <div
        className="hidden-scrollbar"
        style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          padding: '10px 14px', WebkitOverflowScrolling: 'touch',
        }}
      >
        {chips.map(c => {
          const active = activeCategory === c.id
          return (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              style={{
                flexShrink: 0, cursor: 'pointer',
                padding: '7px 14px', borderRadius: 16,
                fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                background: active ? 'var(--grad-brand)' : 'rgba(255,255,255,0.08)',
                color: active ? 'white' : 'rgba(255,255,255,0.65)',
                border: active ? 'none' : '1px solid rgba(255,255,255,0.08)',
                transition: 'background 0.15s, color 0.15s',
                touchAction: 'manipulation',
              }}
            >
              {c.emoji} {c.label}
            </button>
          )
        })}
      </div>

      {/* 2-column thumbnail grid */}
      {filtered.length === 0 ? (
        <div style={{ paddingTop: 60, textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Nothing in this topic yet.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          padding: '4px 10px 32px',
        }}>
          {filtered.map(v => <LongFlickGridCard key={v.id} video={v} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  )
}

// Mounts a real <video> element only once the card scrolls near the viewport, and
// keeps it mounted after that. Without this, a grid of 20-30 cards each carrying a
// live <video preload="metadata"> tag overloads mid/low-end Android GPUs — the
// browser can't composite/decode them all at once, which shows up as torn,
// ghosted, duplicated-looking frames in screenshots and on-device.
function useInView<T extends HTMLElement>(rootMargin = '600px 0px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect() } },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView, rootMargin])
  return [ref, inView] as const
}

function LongFlickGridCard({ video: v, onOpen }: { video: FlickPost; onOpen: (v: FlickPost) => void }) {
  const profile = v.profiles
  const [thumbRef, inView] = useInView<HTMLDivElement>()

  return (
    <button
      onClick={() => onOpen(v)}
      style={{
        textAlign: 'left', border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.04)', borderRadius: 14,
        cursor: 'pointer', padding: 0, overflow: 'hidden',
        touchAction: 'manipulation', display: 'flex', flexDirection: 'column',
        // Isolates this card's paint/layout from its siblings — without this, one
        // card's async image/video swapping in can force the browser to repaint
        // the whole scroll container on the next frame, which is what produces
        // the torn/duplicated-looking rows during fast scroll on weaker GPUs.
        contain: 'layout paint style',
      } as React.CSSProperties}
    >
      {/* Thumbnail */}
      <div ref={thumbRef} style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
        {v.thumbnail_url ? (
          // Static poster image — cheap to render even 30+ at once, no decoding needed.
          // No native `loading="lazy"` here — the IntersectionObserver above already
          // gates when this card's contents mount at all, so a second independent
          // lazy-load timer only adds another source of layout-shift-on-scroll.
          <img
            src={v.thumbnail_url}
            alt=""
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : inView ? (
          // No poster available — only mount a real <video> once this card is
          // actually near the viewport, so we're never decoding 20+ videos at once.
          <video
            src={v.media_url}
            preload="metadata"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted
          />
        ) : (
          // Off-screen placeholder — no decode cost at all.
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg, #1a1816, #0d0c0b)' }} />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.15)',
        }}>
          {/* Solid background instead of backdrop-filter: blur() — blur is compositor-
              expensive, and this same overlay repeats on every card in the grid.
              At 20-30 cards on screen it was enough to make Chrome drop/tear frames
              mid-scroll, which is what showed up as ghosted/duplicated content. */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(15,13,12,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <Play size={14} fill="white" color="white" style={{ marginLeft: 1 }} />
          </div>
        </div>
        {!!v.video_duration && (
          <span style={{
            position: 'absolute', bottom: 6, right: 6,
            background: 'rgba(0,0,0,0.75)', color: 'white',
            fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
          }}>
            {formatDuration(v.video_duration)}
          </span>
        )}
        {/* Category badge — solid background, same reasoning as the play button above */}
        <span style={{
          position: 'absolute', top: 6, left: 6,
          background: 'rgba(15,13,12,0.75)',
          color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
        }}>
          {getCategoryMeta(v.category).emoji}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: '8px 9px', display: 'flex', gap: 7 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          background: 'var(--grad-brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 10,
        }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : profile?.username?.[0]?.toUpperCase() ?? '?'
          }
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* Fixed-height wrapper reserved whether or not there's a caption, so every
              card in a row is the same height from the very first paint — a card
              that's shorter because it has no caption is exactly the kind of layout
              shift that produces seams/ghosting when the OS stitches a scroll-capture
              screenshot together. */}
          <div style={{ minHeight: 34 }}>
            {v.content && (
              <p style={{
                color: 'rgba(255,255,255,0.92)', fontSize: 12.5, fontWeight: 600, margin: 0,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                lineHeight: 1.35,
              } as React.CSSProperties}>
                {v.content}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              @{profile?.username ?? 'unknown'}
            </span>
            {profile?.country && <span style={{ fontSize: 11, flexShrink: 0 }}>{getFlag(profile.country)}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Heart size={10} /> {v.likes?.length ?? 0}
            </span>
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)' }}>· {timeAgo(v.created_at)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

// ── Video search: dedicated overlay covering both Flicks and Long Flicks ──────
function SearchOverlay({ onClose, onSelect }: { onClose: () => void; onSelect: (v: FlickPost) => void }) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FlickPost[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [trending, setTrending] = useState<{ tag: string; count: number }[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus + load default state (trending tags on video posts, recent searches)
  useEffect(() => {
    inputRef.current?.focus()
    try {
      setRecent(JSON.parse(localStorage.getItem('nia:flicks-recent-searches') ?? '[]'))
    } catch { /* ignore malformed storage */ }

    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    supabase
      .from('hashtags')
      .select('tag, posts:post_id!inner(media_type)')
      .eq('posts.media_type', 'video')
      .gte('created_at', since)
      .then(({ data }) => {
        const counts = (data ?? []).reduce((acc: Record<string, number>, h: any) => {
          acc[h.tag] = (acc[h.tag] ?? 0) + 1
          return acc
        }, {})
        setTrending(
          Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 10)
            .map(([tag, count]) => ({ tag, count }))
        )
      })
  }, []) // eslint-disable-line

  async function runSearch(q: string) {
    const term = q.trim()
    if (!term) { setResults([]); setHasSearched(false); return }
    setLoading(true)
    setHasSearched(true)

    const like = `%${term}%`
    const tagTerm = term.replace(/^#/, '')

    const [{ data: byContent }, { data: tagRows }] = await Promise.all([
      supabase
        .from('posts')
        .select(`
          id, content, media_url, thumbnail_url, created_at, language, video_duration, category,
          profiles:user_id (id, username, avatar_url, country),
          likes (user_id), comments (id)
        `)
        .eq('media_type', 'video')
        .ilike('content', like)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('hashtags')
        .select('post_id')
        .ilike('tag', `%${tagTerm}%`)
        .limit(20),
    ])

    let byTag: any[] = []
    const tagPostIds = [...new Set((tagRows ?? []).map((r: any) => r.post_id))]
    if (tagPostIds.length > 0) {
      const { data } = await supabase
        .from('posts')
        .select(`
          id, content, media_url, thumbnail_url, created_at, language, video_duration, category,
          profiles:user_id (id, username, avatar_url, country),
          likes (user_id), comments (id)
        `)
        .eq('media_type', 'video')
        .in('id', tagPostIds)
        .order('created_at', { ascending: false })
        .limit(20)
      byTag = data ?? []
    }

    const merged = [...(byContent ?? []), ...byTag]
    const deduped = [...new Map(merged.map(p => [p.id, p])).values()] as unknown as FlickPost[]
    setResults(deduped)
    setLoading(false)

    // Save to recent searches
    try {
      const next = [term, ...recent.filter(r => r !== term)].slice(0, 8)
      setRecent(next)
      localStorage.setItem('nia:flicks-recent-searches', JSON.stringify(next))
    } catch { /* ignore storage errors (private mode etc.) */ }
  }

  function handleChange(v: string) {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(v), 300)
  }

  // Without this, closing the overlay while a debounced search is in flight
  // (or mid-timeout) fires setState on an unmounted component.
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#0D0C0B', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.08)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} color="rgba(255,255,255,0.8)" />
        </button>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleChange(e.target.value)}
            placeholder="Search flicks — captions, #hashtags…"
            style={{
              width: '100%', padding: '9px 12px 9px 34px', borderRadius: 20, outline: 'none',
              fontSize: 15, background: 'rgba(255,255,255,0.07)', color: 'white',
              border: '1.5px solid rgba(255,255,255,0.09)',
            }}
          />
          {loading && (
            <Loader2 size={14} className="animate-spin" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
        {!hasSearched ? (
          <>
            {recent.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Recent
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {recent.map(r => (
                    <button
                      key={r}
                      onClick={() => { setQuery(r); runSearch(r) }}
                      style={{
                        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.75)', borderRadius: 16, padding: '6px 12px',
                        fontSize: 12.5, cursor: 'pointer',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Trending in Flicks
            </p>
            {trending.length === 0 ? (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Nothing trending yet — be the first to tag a video!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {trending.map(t => (
                  <button
                    key={t.tag}
                    onClick={() => { setQuery(`#${t.tag}`); runSearch(`#${t.tag}`) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none',
                      color: 'white', padding: '10px 4px', cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Hash size={14} color="rgba(255,255,255,0.6)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 700, margin: 0 }}>#{t.tag}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{t.count} video{t.count !== 1 ? 's' : ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : loading && results.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
            <Loader2 size={22} className="animate-spin" style={{ color: 'rgba(255,255,255,0.35)' }} />
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🤔</div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>No flicks found for "{query}"</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Previously this wrapped LongFlickGridCard's own <button> in a <Link>
                (an <a> wrapping a <button> — invalid HTML, and unpredictable click
                behavior across browsers). It also navigated to a generic /posts/:id
                page, which ignored the in-app player entirely and behaved
                differently for a short flick vs a long one found via search.
                onOpen -> onSelect now opens the same detail player used elsewhere,
                whether the result is a short or long flick. */}
            {results.map(v => (
              <LongFlickGridCard key={v.id} video={v} onOpen={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Long Flicks: dedicated player screen ─────────────────────────────────────
function LongFlickPlayer({
  video, currentUserId, commentCount, onOpenComments, onClose,
}: {
  video: FlickPost
  currentUserId: string
  commentCount: number
  onOpenComments: (postId: string, count: number) => void
  onClose: () => void
}) {
  const supabase = createClient()
  const [liked, setLiked] = useState(video.likes?.some(l => l.user_id === currentUserId) ?? false)
  const [likeCount, setLikeCount] = useState(video.likes?.length ?? 0)
  const [copied, setCopied] = useState(false)
  const profile = video.profiles

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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#0D0C0B', overflowY: 'auto' }}>
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 'calc(14px + env(safe-area-inset-top, 0px))', left: 14, zIndex: 10,
          width: 34, height: 34, borderRadius: '50%', border: 'none',
          background: 'rgba(0,0,0,0.55)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          touchAction: 'manipulation',
        }}
      >
        <X size={16} color="white" />
      </button>

      {/* Player */}
      <video
        src={video.media_url}
        poster={video.thumbnail_url ?? undefined}
        controls autoPlay playsInline
        style={{ width: '100%', maxHeight: '50vh', background: '#000', display: 'block' }}
      />

      {/* Info */}
      <div style={{ padding: '14px 16px calc(14px + env(safe-area-inset-bottom, 0px))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Link href={`/profile/${profile?.id}`} style={{ display: 'flex' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
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
          <div style={{ minWidth: 0 }}>
            <Link href={`/profile/${profile?.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>@{profile?.username ?? 'unknown'}</span>
              {profile?.country && <span style={{ fontSize: 13 }}>{getFlag(profile.country)}</span>}
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11.5 }}>{timeAgo(video.created_at)}</span>
          </div>
        </div>

        {video.content && (
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.55, marginBottom: 14 }}>
            {video.content}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
          <button onClick={toggleLike} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', padding: '10px 0', touchAction: 'manipulation' }}>
            <Heart size={20} fill={liked ? '#ff4d6d' : 'none'} color={liked ? '#ff4d6d' : 'rgba(255,255,255,0.8)'} strokeWidth={1.8} />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 700 }}>{likeCount}</span>
          </button>
          <button onClick={() => onOpenComments(video.id, commentCount)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', padding: '10px 0', touchAction: 'manipulation' }}>
            <MessageCircle size={20} color="rgba(255,255,255,0.8)" strokeWidth={1.8} />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 700 }}>{commentCount}</span>
          </button>
          <button onClick={share} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', padding: '10px 0', touchAction: 'manipulation' }}>
            {copied ? <Check size={18} color="rgba(255,255,255,0.8)" /> : <Share2 size={18} color="rgba(255,255,255,0.8)" strokeWidth={1.8} />}
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 700 }}>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Single Flick Item ─────────────────────────────────────────────────────────
function FlickItem({
  video, isActive, shouldMount, slowConnection, muted, onToggleMute,
  currentUserId, commentCount, onOpenComments, showSoundHint,
}: {
  video: FlickPost
  isActive: boolean
  shouldMount: boolean
  slowConnection: boolean
  muted: boolean
  onToggleMute: () => void
  currentUserId: string
  commentCount: number
  onOpenComments: (postId: string, count: number) => void
  showSoundHint: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const viewTracked = useRef(false)
  const lastTapRef = useRef(0)
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  const [playing, setPlaying] = useState(false)
  const [liked, setLiked] = useState(video.likes?.some(l => l.user_id === currentUserId) ?? false)
  const [likeCount, setLikeCount] = useState(video.likes?.length ?? 0)
  const [progress, setProgress] = useState(0)
  const [viewCount, setViewCount] = useState<number>(video.post_views?.length ?? 0)
  const [copied, setCopied] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [errored, setErrored] = useState(false)
  const [showBigHeart, setShowBigHeart] = useState(false)

  // Track view once per active session — count comes from the joined `post_views`
  // in the server query now, so no extra fetch per video on mount.
  useEffect(() => {
    if (isActive && !viewTracked.current && currentUserId) {
      viewTracked.current = true
      supabase
        .from('post_views')
        .insert({ post_id: video.id, user_id: currentUserId })
        .then(({ error }) => {
          if (!error) setViewCount(c => c + 1)
        })
    }
  }, [isActive]) // eslint-disable-line

  // Play / pause based on active state (only meaningful once the <video> is mounted)
  useEffect(() => {
    const v = videoRef.current
    if (!v || !shouldMount) return
    if (isActive) {
      v.currentTime = 0
      v.play().then(() => setPlaying(true)).catch(() => { })
    } else {
      v.pause()
      setPlaying(false)
      setProgress(0)
    }
  }, [isActive, shouldMount])

  // Sync mute
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  useEffect(() => {
    return () => { if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current) }
  }, [])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play().then(() => setPlaying(true)).catch(() => { }) }
    else { v.pause(); setPlaying(false) }
  }

  async function likeIfNotAlready() {
    if (liked) return
    setLiked(true); setLikeCount(c => c + 1)
    await supabase.from('likes').insert({ post_id: video.id, user_id: currentUserId })
  }

  async function toggleLike() {
    if (liked) {
      setLiked(false); setLikeCount(c => c - 1)
      await supabase.from('likes').delete().eq('post_id', video.id).eq('user_id', currentUserId)
    } else {
      await likeIfNotAlready()
    }
  }

  // Single tap = play/pause. Double tap = like (Instagram-style: always likes, never unlikes)
  // plus a big center heart burst. touchAction: 'manipulation' on the video kills the native
  // double-tap-to-zoom gesture so this doesn't fight the browser on mobile.
  function handleTap() {
    const now = Date.now()
    const dt = now - lastTapRef.current
    if (dt > 0 && dt < DOUBLE_TAP_MS) {
      if (tapTimeoutRef.current) { clearTimeout(tapTimeoutRef.current); tapTimeoutRef.current = null }
      lastTapRef.current = 0
      likeIfNotAlready()
      setShowBigHeart(true)
      setTimeout(() => setShowBigHeart(false), 700)
    } else {
      lastTapRef.current = now
      tapTimeoutRef.current = setTimeout(() => {
        togglePlay()
        tapTimeoutRef.current = null
      }, DOUBLE_TAP_MS)
    }
  }

  function retryVideo() {
    setErrored(false)
    const v = videoRef.current
    if (!v) return
    v.load()
    if (isActive) v.play().then(() => setPlaying(true)).catch(() => { })
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

  // Only preload aggressively for the active video, or for neighbors when we're
  // not on a constrained connection — keeps data usage sane on 3G.
  const preload = isActive ? 'auto' : slowConnection ? 'none' : 'metadata'

  return (
    <div
      style={{
        position: 'relative', width: '100%',
        height: '100dvh',
        scrollSnapAlign: 'start', scrollSnapStop: 'always',
        background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {shouldMount ? (
        <video
          ref={videoRef}
          src={video.media_url}
          poster={video.thumbnail_url ?? undefined}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            touchAction: 'manipulation', WebkitUserSelect: 'none', userSelect: 'none',
          } as React.CSSProperties}
          loop playsInline preload={preload}
          onTimeUpdate={() => {
            const v = videoRef.current
            if (v && v.duration) setProgress((v.currentTime / v.duration) * 100)
          }}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => { setBuffering(false); setErrored(false) }}
          onCanPlay={() => setBuffering(false)}
          onError={() => { setBuffering(false); setErrored(true) }}
          onClick={handleTap}
        />
      ) : (
        // Lightweight placeholder for off-screen videos — no decoder, no network request
        // beyond the (already cached) poster image. This is what keeps memory sane once
        // someone's scrolled through 20+ flicks on a low-end device.
        <div
          onClick={handleTap}
          style={{
            position: 'absolute', inset: 0,
            background: video.thumbnail_url
              ? `#000 url(${video.thumbnail_url}) center / cover no-repeat`
              : 'linear-gradient(180deg, #1a1815 0%, #0D0C0B 100%)',
          }}
        />
      )}

      {/* Cinematic gradient */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.2) 100%)',
        }}
      />

      {/* Buffering spinner — distinguishes "loading" from "broken" on slow connections */}
      {buffering && isActive && !errored && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <Loader2 size={34} className="animate-spin" style={{ color: 'rgba(255,255,255,0.85)' }} />
        </div>
      )}

      {/* Error state with retry */}
      {errored && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: 'rgba(0,0,0,0.55)',
        }}>
          <AlertCircle size={30} color="rgba(255,255,255,0.75)" />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600 }}>Couldn't load this video</p>
          <button
            onClick={retryVideo}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)',
              color: 'white', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation',
            }}
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Pause overlay */}
      {!playing && !buffering && !errored && (
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

      {/* Double-tap like burst */}
      {showBigHeart && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', zIndex: 8,
        }}>
          <Heart
            size={110}
            fill="#ff4d6d"
            color="#ff4d6d"
            style={{ animation: 'niaHeartBurst 0.7s ease-out forwards', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.4))' }}
          />
        </div>
      )}

      {/* "Tap for sound" hint — only on the very first flick, only while muted */}
      {showSoundHint && isActive && (
        <div style={{
          position: 'absolute', top: 'calc(72px + env(safe-area-inset-top, 0px))', left: 0, right: 0,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 9,
          animation: 'niaSoundHintFade 3.5s ease-out forwards',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            padding: '6px 14px', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            <VolumeX size={13} color="white" />
            <span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>Tap the speaker for sound</span>
          </div>
        </div>
      )}

      {/* ── Right action rail ───────────────────────────── */}
      <div style={{
        position: 'absolute', right: 12, bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
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
            {viewCount > 0 ? (viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount) : ''}
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
            transition: 'transform 0.1s', touchAction: 'manipulation',
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
        position: 'absolute', bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))', left: 0, right: 68,
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
            <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.9 }}>{getFlag(profile.country)}</span>
          )}
          {video.language && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.85)',
              background: 'rgba(255,255,255,0.14)', padding: '2px 7px', borderRadius: 8,
              textTransform: 'uppercase', letterSpacing: 0.3,
            }}>
              {video.language}
            </span>
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

      {/* Progress bar — top of screen, white */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3, background: 'rgba(255,255,255,0.2)', zIndex: 10,
      }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'rgba(255,255,255,0.9)',
          transition: 'width 0.25s linear',
          borderRadius: '0 2px 2px 0',
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
        padding: 0, transition: 'transform 0.12s', touchAction: 'manipulation',
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