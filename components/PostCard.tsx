'use client'

import {
  getFlag,
  getLanguageEmoji,
} from '@/lib/african-data'

import { useState, useRef } from 'react'

import { createClient } from '@/lib/supabase/client'

import {
  MessageCircle,
  Share2,
  Languages,
  Loader2,
  Play,
  Pause,
  Send,
  Repeat2,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Check,
  BadgeCheck,
} from 'lucide-react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import TipButton from '@/components/TipButton'
import PollCard from '@/components/PollCard'

function timeAgo(date: string) {
  const s = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  )
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

const REACTIONS = ['❤️', '😂', '🔥', '😮', '👏', '😢']

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
  const [newComment, setNewComment] = useState('')
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

  // Edit / Delete state
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content ?? '')
  const [editLoading, setEditLoading] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const commentRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const totalReactions = Object.values(localReactions).reduce((a, b) => a + b, 0)
  const isOwn = post.profiles?.id === currentUserId

  // ── Edit ─────────────────────────────
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

  // ── Delete ───────────────────────────
  async function deletePost() {
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (!error) { setIsDeleted(true); router.refresh() }
    setShowDeleteConfirm(false)
  }

  // ── Reactions ────────────────────────
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
    setTimeout(() => { commentRef.current?.focus() }, 100)
  }

  async function submitComment() {
    if (!newComment.trim() || !currentUserId) return
    setPosting(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: currentUserId, content: newComment.trim() })
      .select('*, profiles:user_id (id, username, avatar_url)')
      .single()
    if (!error && data) { setComments((prev) => [...prev, data]); setNewComment('') }
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

  // poll is returned as array from supabase join, grab first item
  const poll = Array.isArray(post.poll) ? post.poll[0] : post.poll

  return (
    <article
      className="card card-hover overflow-hidden anim-up"
      onClick={() => { if (showMenu) setShowMenu(false) }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <Link href={post.is_anonymous ? '#' : `/profile/${post.profiles?.id}`} className="flex-shrink-0">
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
            <Link
              href={post.is_anonymous ? '#' : `/profile/${post.profiles?.id}`}
              className="font-bold text-sm hover:underline"
            >
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
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {timeAgo(post.created_at)}
            </span>
            {post.updated_at && post.updated_at !== post.created_at && (
              <span className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>· edited</span>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
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
                      <Pencil size={15} style={{ color: 'var(--nia-violet)' }} />
                      Edit post
                    </button>
                  )}
                  <button
                    onClick={() => { setShowDeleteConfirm(true); setShowMenu(false) }}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold transition-colors text-left"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={15} />
                    Delete post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Mode ──────────────────────────────────────── */}
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
              {editLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Text Content ─────────────────────────────── */}
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

          {/* ── Media ────────────────────────────────────── */}
          {post.media_url && post.media_type === 'image' && (
            <div className="px-4 pb-3">
              <img
                src={post.media_url}
                alt=""
                className="w-full rounded-2xl object-cover max-h-80"
                style={{ border: '1px solid var(--border)' }}
              />
            </div>
          )}

          {post.media_url && post.media_type === 'video' && (
            <div className="px-4 pb-3">
              <video
                src={post.media_url}
                controls
                className="w-full rounded-2xl max-h-80"
                style={{ border: '1px solid var(--border)' }}
              />
            </div>
          )}

          {post.media_url && post.media_type === 'audio' && (
            <div className="px-4 pb-3">
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: 'var(--surface-2)' }}
              >
                <button
                  onClick={toggleAudio}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  style={{ background: 'var(--grad-brand)' }}
                >
                  {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Voice message
                </span>
                <audio
                  ref={audioRef}
                  src={post.media_url}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Poll ───────────────────────────────────────────── */}
      {poll && <PollCard poll={poll} currentUserId={currentUserId} />}

      {/* ── Reaction summary row ───────────────────────────── */}
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
          {totalReactions > 0 && (
            <span className="text-xs ml-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {totalReactions} reaction{totalReactions !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* ── Action Bar ─────────────────────────────────────── */}
      <div
        className="flex items-center gap-1 px-3 py-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Reaction button */}
        <div className="relative">
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90"
            style={
              activeReaction
                ? { background: 'rgba(168,85,247,0.1)', color: 'var(--nia-violet)' }
                : { background: 'transparent', color: 'var(--text-tertiary)' }
            }
          >
            <span className={activeReaction ? 'heart-pop' : ''}>
              {activeReaction ?? '🤍'}
            </span>
            {totalReactions > 0 && (
              <span className="text-xs">{totalReactions}</span>
            )}
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

        {/* Comment button */}
        <button
          onClick={loadComments}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90"
          style={
            showComments
              ? { background: 'rgba(168,85,247,0.1)', color: 'var(--nia-violet)' }
              : { background: 'transparent', color: 'var(--text-tertiary)' }
          }
        >
          {loadingComments ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <MessageCircle size={16} />
          )}
          {(post.comments?.length ?? 0) > 0 && (
            <span className="text-xs">{post.comments.length}</span>
          )}
        </button>

        {/* Repost button */}
        {!isOwn && (
          <button
            onClick={handleRepost}
            disabled={reposted}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90 disabled:opacity-50"
            style={
              reposted
                ? { background: 'rgba(107,203,119,0.1)', color: 'var(--nia-mint)' }
                : { background: 'transparent', color: 'var(--text-tertiary)' }
            }
          >
            <Repeat2 size={16} />
            {repostCount > 0 && <span className="text-xs">{repostCount}</span>}
          </button>
        )}

        {/* Translate button */}
        {post.content && post.language && post.language !== 'english' && (
          <button
            onClick={handleTranslate}
            disabled={translating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90"
            style={
              translation
                ? { background: 'rgba(78,205,196,0.1)', color: 'var(--nia-sky)' }
                : { background: 'transparent', color: 'var(--text-tertiary)' }
            }
          >
            {translating ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
          </button>
        )}

        {/* Share button */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90 ml-auto"
          style={
            copied
              ? { background: 'rgba(107,203,119,0.1)', color: 'var(--nia-mint)' }
              : { background: 'transparent', color: 'var(--text-tertiary)' }
          }
        >
          {copied ? <Check size={16} /> : <Share2 size={16} />}
        </button>
      </div>

      {/* ── Delete Confirm ─────────────────────────────────── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
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
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-ghost flex-1 text-sm py-2.5">
                Cancel
              </button>
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

      {/* ── Comments Section ───────────────────────────────── */}
      {showComments && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {/* Comment list */}
          {comments.length > 0 && (
            <div className="px-4 pt-3 space-y-3 max-h-64 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5">
                  <Link href={`/profile/${comment.profiles?.id}`} className="flex-shrink-0">
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
                  <div
                    className="flex-1 min-w-0 px-3 py-2 rounded-2xl rounded-tl-sm text-sm"
                    style={{ background: 'var(--surface-2)' }}
                  >
                    <Link
                      href={`/profile/${comment.profiles?.id}`}
                      className="font-bold text-xs mr-1.5"
                      style={{ color: 'var(--nia-violet)' }}
                    >
                      @{comment.profiles?.username}
                    </Link>
                    <span style={{ color: 'var(--text-primary)' }}>{comment.content}</span>
                    <div className="mt-0.5 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {timeAgo(comment.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          <div className="flex gap-2 p-3">
            <input
              ref={commentRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
              placeholder="Write a comment…"
              className="flex-1 px-3 py-2 rounded-2xl text-sm outline-none"
              style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1.5px solid transparent' }}
            />
            <button
              onClick={submitComment}
              disabled={!newComment.trim() || posting}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-white transition-all active:scale-90 disabled:opacity-40"
              style={{ background: 'var(--grad-brand)' }}
            >
              {posting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}