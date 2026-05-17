'use client'

import {
  getFlag,
  getLanguageEmoji,
} from '@/lib/african-data'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MessageCircle, Share2, Languages, Loader2, Play, Pause, Send,
  Repeat2, MoreHorizontal, Pencil, Trash2, X, Check, BadgeCheck,
  ImagePlus, Film, Smile, ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TipButton from '@/components/TipButton'
import PollCard from '@/components/PollCard'
import VideoPlayer from '@/components/VideoPlayer'
import MediaLightbox from '@/components/MediaLightbox'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

const REACTIONS = ['❤️', '😂', '🔥', '😮', '👏', '😢']
const GIF_SUGGESTIONS = [
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
  'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
  'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif',
]

// ── Rich Comment Input ────────────────────────────────────────────────────────
function CommentInput({
  onSubmit,
  posting,
}: {
  onSubmit: (text: string, mediaUrl?: string, mediaType?: string) => Promise<void>
  posting: boolean
}) {
  const [text, setText] = useState('')
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifQuery, setGifQuery] = useState('')
  const [gifResults, setGifResults] = useState<string[]>(GIF_SUGGESTIONS)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `comments/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      const type = file.type.startsWith('video') ? 'video' : 'image'
      setMediaPreview({ url: data.publicUrl, type })
    }
    setUploading(false)
    e.target.value = ''
  }

  async function searchGifs(q: string) {
    setGifQuery(q)
    if (!q.trim()) { setGifResults(GIF_SUGGESTIONS); return }
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(q)}&limit=8&rating=g`
      )
      const data = await res.json()
      setGifResults(data.data?.map((g: any) => g.images.fixed_height.url) ?? GIF_SUGGESTIONS)
    } catch {
      setGifResults(GIF_SUGGESTIONS)
    }
  }

  function pickGif(url: string) {
    setMediaPreview({ url, type: 'gif' })
    setShowGifPicker(false)
    setGifQuery('')
  }

  async function submit() {
    if (!text.trim() && !mediaPreview) return
    await onSubmit(text.trim(), mediaPreview?.url, mediaPreview?.type)
    setText('')
    setMediaPreview(null)
    setShowGifPicker(false)
  }

  return (
    <div className="p-3 space-y-2">
      {/* Media preview */}
      {mediaPreview && (
        <div className="relative inline-block">
          {mediaPreview.type === 'video' ? (
            <video
              src={mediaPreview.url}
              className="h-24 rounded-xl object-cover"
              muted
            />
          ) : (
            <img
              src={mediaPreview.url}
              alt=""
              className="h-24 rounded-xl object-cover"
            />
          )}
          <button
            onClick={() => setMediaPreview(null)}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* GIF picker */}
      {showGifPicker && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-1)' }}
        >
          <div className="p-2">
            <input
              value={gifQuery}
              onChange={(e) => searchGifs(e.target.value)}
              placeholder="Search GIFs…"
              className="input w-full text-sm px-3 py-1.5"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-4 gap-1 p-2 max-h-40 overflow-y-auto">
            {gifResults.map((url, i) => (
              <button key={i} onClick={() => pickGif(url)} className="rounded-lg overflow-hidden aspect-square active:scale-95 transition-transform">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Attachment buttons */}
        <div className="flex gap-1 pb-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFile}
          />
          <button
            onClick={() => { setShowGifPicker(false); fileRef.current?.click() }}
            disabled={uploading}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90"
            style={{ color: 'var(--text-tertiary)', background: 'var(--surface-2)' }}
            title="Photo or video"
          >
            {uploading
              ? <Loader2 size={15} className="animate-spin" />
              : <ImagePlus size={15} />
            }
          </button>
          <button
            onClick={() => setShowGifPicker(!showGifPicker)}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 text-xs font-black"
            style={{
              color: showGifPicker ? 'white' : 'var(--text-tertiary)',
              background: showGifPicker ? 'var(--nia-violet)' : 'var(--surface-2)',
            }}
            title="GIF"
          >
            GIF
          </button>
        </div>

        {/* Text input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
          }}
          placeholder="Reply…"
          rows={1}
          className="flex-1 px-3 py-2 rounded-2xl text-sm outline-none resize-none"
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text-primary)',
            border: '1.5px solid transparent',
            minHeight: '36px',
            maxHeight: '96px',
          }}
        />

        {/* Send */}
        <button
          onClick={submit}
          disabled={(!text.trim() && !mediaPreview) || posting}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white transition-all active:scale-90 disabled:opacity-40 shrink-0"
          style={{ background: 'var(--grad-brand)' }}
        >
          {posting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  )
}

// ── Comment Row ───────────────────────────────────────────────────────────────
function CommentRow({ comment }: { comment: any }) {
  const [lightbox, setLightbox] = useState(false)
  return (
    <div className="flex gap-2.5">
      <Link href={`/profile/${comment.profiles?.id}`} className="shrink-0">
        <div
          className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs"
          style={{ background: 'var(--grad-brand)' }}
        >
          {comment.profiles?.avatar_url ? (
            <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
          ) : (
            comment.profiles?.username?.[0]?.toUpperCase()
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0 space-y-1">
        <div
          className="px-3 py-2 rounded-2xl rounded-tl-sm text-sm"
          style={{ background: 'var(--surface-2)' }}
        >
          <Link
            href={`/profile/${comment.profiles?.id}`}
            className="font-bold text-xs mr-1.5"
            style={{ color: 'var(--nia-violet)' }}
          >
            @{comment.profiles?.username}
          </Link>
          {comment.content && (
            <span style={{ color: 'var(--text-primary)' }}>{comment.content}</span>
          )}
        </div>

        {/* Media attachment */}
        {comment.media_url && (
          <div className="pl-1">
            {comment.media_type === 'video' ? (
              <video
                src={comment.media_url}
                controls
                className="rounded-xl max-h-48 max-w-55"
                style={{ border: '1px solid var(--border)' }}
              />
            ) : (
              <>
                <img
                  src={comment.media_url}
                  alt=""
                  onClick={() => setLightbox(true)}
                  className="rounded-xl max-h-48 max-w-55 object-cover cursor-pointer active:scale-98 transition-transform"
                  style={{ border: '1px solid var(--border)' }}
                />
                {lightbox && (
                  <MediaLightbox
                    items={[{ url: comment.media_url, type: 'image' }]}
                    startIndex={0}
                    onClose={() => setLightbox(false)}
                  />
                )}
              </>
            )}
          </div>
        )}

        <div className="text-[10px] pl-1" style={{ color: 'var(--text-tertiary)' }}>
          {timeAgo(comment.created_at)}
        </div>
      </div>
    </div>
  )
}

// ── Main PostCard ─────────────────────────────────────────────────────────────
export default function PostCard({ post, currentUserId }: any) {
  const supabase = createClient()
  const router = useRouter()

  const reactionCounts: Record<string, number> = {}
  const myReaction: string | null =
    post.reactions?.find((r: any) => r.user_id === currentUserId)?.emoji ?? null
  post.reactions?.forEach((r: any) => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1
  })

  const [activeReaction, setActiveReaction] = useState<string | null>(myReaction)
  const [localReactions, setLocalReactions] = useState<Record<string, number>>(reactionCounts)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [posting, setPosting] = useState(false)
  const [translation, setTranslation] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reposted, setReposted] = useState(
    post.reposts?.some((r: any) => r.user_id === currentUserId) ?? false
  )
  const [repostCount, setRepostCount] = useState(post.reposts?.length ?? 0)
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content ?? '')
  const [editLoading, setEditLoading] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [commentCount, setCommentCount] = useState(post.comments?.length ?? 0)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const totalReactions = Object.values(localReactions).reduce((a, b) => a + b, 0)
  const isOwn = post.profiles?.id === currentUserId

  async function saveEdit() {
    if (!editContent.trim()) return
    setEditLoading(true)
    const { error } = await supabase
      .from('posts')
      .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
      .eq('id', post.id)
    if (!error) { setIsEditing(false); router.refresh() }
    setEditLoading(false)
  }

  async function deletePost() {
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (!error) { setIsDeleted(true); router.refresh() }
    setShowDeleteConfirm(false)
  }

  async function handleReaction(emoji: string) {
    if (!currentUserId) return
    setShowReactionPicker(false)
    const newCounts = { ...localReactions }
    if (activeReaction === emoji) {
      await supabase.from('reactions').delete().match({ post_id: post.id, user_id: currentUserId })
      newCounts[emoji] = Math.max((newCounts[emoji] ?? 1) - 1, 0)
      setActiveReaction(null)
    } else {
      if (activeReaction) {
        await supabase.from('reactions').delete().match({ post_id: post.id, user_id: currentUserId })
        newCounts[activeReaction] = Math.max((newCounts[activeReaction] ?? 1) - 1, 0)
      }
      await supabase.from('reactions').insert({ post_id: post.id, user_id: currentUserId, emoji })
      newCounts[emoji] = (newCounts[emoji] ?? 0) + 1
      setActiveReaction(emoji)
    }
    setLocalReactions(newCounts)
  }

  async function handleRepost() {
    if (!currentUserId || reposted || isOwn) return
    await supabase.from('reposts').insert({ post_id: post.id, user_id: currentUserId })
    setReposted(true)
    setRepostCount((c: number) => c + 1)
  }

  async function loadComments() {
    if (showComments) { setShowComments(false); return }
    setLoadingComments(true)
    const { data } = await supabase
      .from('comments')
      .select('*, profiles:user_id (id, username, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setComments(data ?? [])
    setLoadingComments(false)
    setShowComments(true)
  }

  async function submitComment(text: string, mediaUrl?: string, mediaType?: string) {
    if (!currentUserId) return
    setPosting(true)
    const payload: any = { post_id: post.id, user_id: currentUserId }
    if (text) payload.content = text
    if (mediaUrl) { payload.media_url = mediaUrl; payload.media_type = mediaType }

    const { data, error } = await supabase
      .from('comments')
      .insert(payload)
      .select('*, profiles:user_id (id, username, avatar_url)')
      .single()
    if (!error && data) {
      setComments((prev) => [...prev, data])
      setCommentCount((c: number) => c + 1)
    }
    setPosting(false)
    router.refresh()
  }

  async function handleTranslate() {
    if (translation) { setTranslation(null); return }
    if (!post.content) return
    setTranslating(true)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: post.content, targetLang: 'en' }),
      })
      const data = await res.json()
      setTranslation(data.translation ?? null)
    } finally { setTranslating(false) }
  }

  async function handleShare() {
    const url = `${window.location.origin}/posts/${post.id}`
    if (navigator.share) {
      try { await navigator.share({ title: `@${post.profiles?.username} on Nia`, text: post.content ?? '', url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function toggleAudio() {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause() } else { audioRef.current.play() }
    setIsPlaying(!isPlaying)
  }

  if (isDeleted) return null

  const displayName = post.is_anonymous ? 'Anonymous 🎭' : `@${post.profiles?.username}`
  const topReactions = Object.entries(localReactions)
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
  const poll = Array.isArray(post.poll) ? post.poll[0] : post.poll

  return (
    <article
      className="card card-hover overflow-hidden anim-up"
      onClick={() => { if (showMenu) setShowMenu(false) }}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <Link href={post.is_anonymous ? '#' : `/profile/${post.profiles?.id}`} className="shrink-0">
          <div className="avatar-ring">
            <div
              className="w-10 h-10 rounded-full overflow-hidden"
              style={{ background: post.is_anonymous ? 'linear-gradient(135deg,#555,#333)' : 'var(--grad-brand)' }}
            >
              {!post.is_anonymous && post.profiles?.avatar_url ? (
                <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                  {post.is_anonymous ? '🎭' : post.profiles?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={post.is_anonymous ? '#' : `/profile/${post.profiles?.id}`} className="font-bold text-sm hover:underline">
              {displayName}
            </Link>
            {post.profiles?.is_verified && (
              <BadgeCheck size={15} style={{ color: 'var(--nia-violet)' }} fill="rgba(168,85,247,0.15)" />
            )}
            {!post.is_anonymous && post.profiles?.country && (
              <span title={post.profiles.country} className="text-base leading-none">
                {getFlag(post.profiles.country)}
              </span>
            )}
            {post.circles && (
              <Link
                href={`/circles/${post.circles.slug}`}
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: 'linear-gradient(135deg,rgba(255,107,107,0.15),rgba(168,85,247,0.15))', color: 'var(--nia-violet)' }}
              >
                {post.circles.name}
              </Link>
            )}
            {post.language && post.language !== 'english' && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}
              >
                {getLanguageEmoji(post.language)} {post.language}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {!post.is_anonymous && post.profiles?.country && (
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {post.profiles.city ? `${post.profiles.city}, ${post.profiles.country}` : post.profiles.country}
              </span>
            )}
            {!post.is_anonymous && <span style={{ color: 'var(--text-tertiary)' }}>·</span>}
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(post.created_at)}</span>
            {post.updated_at && post.updated_at !== post.created_at && (
              <span className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>· edited</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isOwn && !post.is_anonymous && post.profiles?.id && (
            <TipButton recipientUserId={post.profiles.id} recipientUsername={post.profiles.username} />
          )}
          {isOwn && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90"
                style={{ color: 'var(--text-tertiary)', background: showMenu ? 'var(--surface-2)' : 'transparent' }}
              >
                <MoreHorizontal size={18} />
              </button>
              {showMenu && (
                <div
                  className="absolute right-0 top-10 z-30 w-40 rounded-2xl overflow-hidden anim-pop"
                  style={{ background: 'var(--surface-0)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.content !== null && (
                    <button
                      onClick={() => { setIsEditing(true); setShowMenu(false) }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold transition-colors text-left"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Pencil size={15} style={{ color: 'var(--nia-violet)' }} /> Edit post
                    </button>
                  )}
                  <button
                    onClick={() => { setShowDeleteConfirm(true); setShowMenu(false) }}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold transition-colors text-left"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={15} /> Delete post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Mode ────────────────────────────────────────── */}
      {isEditing ? (
        <div className="px-4 pb-3 space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="input resize-none text-[15px] w-full"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setIsEditing(false); setEditContent(post.content ?? '') }}
              className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-sm flex-1 justify-center"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={!editContent.trim() || editLoading}
              className="btn-primary flex items-center gap-1.5 px-3 py-2 text-sm flex-1 justify-center"
              style={{ borderRadius: '12px' }}
            >
              {editLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
            </button>
          </div>
        </div>
      ) : (
        <>
          {post.content && (
            <div className="px-4 pb-3">
              <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {post.content.split(/(\s+)/).map((word: string, i: number) =>
                  word.startsWith('#') ? (
                    <Link key={i} href={`/tags/${word.slice(1).toLowerCase()}`} className="font-bold" style={{ color: 'var(--nia-violet)' }}>
                      {word}
                    </Link>
                  ) : word
                )}
              </p>
              {translation && (
                <div
                  className="mt-2 text-sm italic px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', borderLeft: '3px solid var(--nia-violet)' }}
                >
                  {translation}
                </div>
              )}
            </div>
          )}

          {post.media_url && (post.media_type === 'image' || post.media_type === 'video') && (() => {
            const all: { url: string; type: 'image' | 'video' }[] = [
              { url: post.media_url, type: post.media_type as 'image' | 'video' },
              ...(Array.isArray(post.extra_media) ? post.extra_media : []),
            ]
            const isTwoUp = all.length === 2
            return (
              <>
                <div className="px-4 pb-3">
                  <div className={isTwoUp ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}>
                    {all.map((m, i) => (
                      <div
                        key={i}
                        className="relative rounded-2xl overflow-hidden"
                        style={{ aspectRatio: isTwoUp ? '1/1' : undefined, border: '1px solid var(--border)' }}
                      >
                        {m.type === 'image' ? (
                          <>
                            <img
                              src={m.url} alt="" className="w-full h-full object-cover cursor-pointer"
                              style={{ display: 'block', maxHeight: isTwoUp ? undefined : 320 }}
                              onClick={() => setLightboxIndex(i)}
                            />
                            <button
                              onClick={() => setLightboxIndex(i)}
                              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-90"
                              style={{ background: 'rgba(0,0,0,0.45)' }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                              </svg>
                            </button>
                          </>
                        ) : (
                          <VideoPlayer src={m.url} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {lightboxIndex !== null && (
                  <MediaLightbox items={all} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
                )}
              </>
            )
          })()}

          {post.media_url && post.media_type === 'audio' && (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'var(--surface-2)' }}>
                <button
                  onClick={toggleAudio}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ background: 'var(--grad-brand)' }}
                >
                  {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Voice message</span>
                <audio ref={audioRef} src={post.media_url} onEnded={() => setIsPlaying(false)} className="hidden" />
              </div>
            </div>
          )}
        </>
      )}

      {poll && <PollCard poll={poll} currentUserId={currentUserId} />}

      {/* ── Reaction summary ────────────────────────────────── */}
      {totalReactions > 0 && (
        <div className="px-4 pb-2 flex items-center gap-1.5">
          {topReactions.map(([emoji, count]) => (
            <span
              key={emoji}
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
            >
              {emoji} {count}
            </span>
          ))}
          <span className="text-xs ml-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {totalReactions} reaction{totalReactions !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Action Bar ──────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-2" style={{ borderTop: '1px solid var(--border)' }}>
        {/* Reaction */}
        <div className="relative">
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90"
            style={activeReaction
              ? { background: 'rgba(168,85,247,0.1)', color: 'var(--nia-violet)' }
              : { background: 'transparent', color: 'var(--text-tertiary)' }
            }
          >
            <span className={activeReaction ? 'heart-pop' : ''}>{activeReaction ?? '🤍'}</span>
            {totalReactions > 0 && <span className="text-xs">{totalReactions}</span>}
          </button>
          {showReactionPicker && (
            <div
              className="absolute bottom-full mb-2 left-0 z-20 flex gap-1 p-2 rounded-2xl anim-pop"
              style={{ background: 'var(--surface-0)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}
            >
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-lg transition-all hover:scale-125 active:scale-95"
                  style={activeReaction === emoji ? { background: 'var(--surface-2)' } : {}}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comment */}
        <button
          onClick={loadComments}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90"
          style={showComments
            ? { background: 'rgba(168,85,247,0.1)', color: 'var(--nia-violet)' }
            : { background: 'transparent', color: 'var(--text-tertiary)' }
          }
        >
          {loadingComments ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
          {commentCount > 0 && <span className="text-xs">{commentCount}</span>}
        </button>

        {/* Repost */}
        {!isOwn && (
          <button
            onClick={handleRepost}
            disabled={reposted}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90 disabled:opacity-50"
            style={reposted
              ? { background: 'rgba(107,203,119,0.1)', color: 'var(--nia-mint)' }
              : { background: 'transparent', color: 'var(--text-tertiary)' }
            }
          >
            <Repeat2 size={16} />
            {repostCount > 0 && <span className="text-xs">{repostCount}</span>}
          </button>
        )}

        {/* Translate */}
        {post.content && post.language && post.language !== 'english' && (
          <button
            onClick={handleTranslate}
            disabled={translating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90"
            style={translation
              ? { background: 'rgba(78,205,196,0.1)', color: 'var(--nia-sky)' }
              : { background: 'transparent', color: 'var(--text-tertiary)' }
            }
          >
            {translating ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
          </button>
        )}

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90 ml-auto"
          style={copied
            ? { background: 'rgba(107,203,119,0.1)', color: 'var(--nia-mint)' }
            : { background: 'transparent', color: 'var(--text-tertiary)' }
          }
        >
          {copied ? <Check size={16} /> : <Share2 size={16} />}
        </button>
      </div>

      {/* ── Delete Confirm ──────────────────────────────────── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-200 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl p-6 space-y-4 anim-pop"
            style={{ background: 'var(--surface-0)', boxShadow: 'var(--shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="text-4xl">🗑️</div>
              <h3 className="font-extrabold text-lg">Delete post?</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                This will permanently remove your post and all its comments.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-ghost flex-1 text-sm py-2.5">Cancel</button>
              <button
                onClick={deletePost}
                className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
                style={{ background: '#ef4444' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Comments Section ────────────────────────────────── */}
      {showComments && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {comments.length > 0 && (
            <div className="px-4 pt-3 space-y-3 max-h-72 overflow-y-auto">
              {comments.map((comment) => (
                <CommentRow key={comment.id} comment={comment} />
              ))}
            </div>
          )}
          <CommentInput onSubmit={submitComment} posting={posting} />
        </div>
      )}
    </article>
  )
}