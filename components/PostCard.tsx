'use client'
import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, MessageCircle, Share2, Languages, Loader2, Play, Pause, Send, Banknote } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TipButton from '@/components/TipButton'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export default function PostCard({ post, currentUserId }: any) {
  const supabase = createClient()
  const router = useRouter()

  const liked = post.likes?.some((l: any) => l.user_id === currentUserId)
  const [isLiked, setIsLiked] = useState(liked)
  const [likeCount, setLikeCount] = useState(post.likes?.length ?? 0)
  const [heartAnim, setHeartAnim] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [posting, setPosting] = useState(false)
  const [translation, setTranslation] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const commentRef = useRef<HTMLInputElement>(null)

  async function toggleLike() {
    if (!currentUserId) return
    setHeartAnim(true)
    setTimeout(() => setHeartAnim(false), 500)
    if (isLiked) {
      await supabase.from('likes').delete().match({ post_id: post.id, user_id: currentUserId })
      setLikeCount((c: number) => c - 1)
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId })
      setLikeCount((c: number) => c + 1)
    }
    setIsLiked(!isLiked)
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
    setTimeout(() => commentRef.current?.focus(), 100)
  }

  async function submitComment() {
    if (!newComment.trim() || !currentUserId) return
    setPosting(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: currentUserId, content: newComment.trim() })
      .select('*, profiles:user_id (id, username, avatar_url)')
      .single()
    if (!error && data) { setComments(prev => [...prev, data]); setNewComment('') }
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

  function toggleAudio() {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause() } else { audioRef.current.play() }
    setIsPlaying(!isPlaying)
  }

  const isOwn = post.profiles?.id === currentUserId

  return (
    <article className="card card-hover overflow-hidden anim-up">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <Link href={`/profile/${post.profiles?.id}`} className="flex-shrink-0">
          <div className="avatar-ring">
            <div className="w-10 h-10 rounded-full overflow-hidden" style={{ background: 'var(--grad-brand)' }}>
              {post.profiles?.avatar_url
                ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                    {post.profiles?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
              }
            </div>
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/profile/${post.profiles?.id}`} className="font-bold text-sm hover:underline">
              @{post.profiles?.username}
            </Link>
            {post.circles && (
              <Link
                href={`/circles/${post.circles.slug}`}
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: 'linear-gradient(135deg,rgba(255,107,107,0.15),rgba(168,85,247,0.15))', color: 'var(--nia-violet)' }}
              >
                {post.circles.name}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {post.profiles?.university?.split(' ').slice(0,2).join(' ')}
            </span>
            <span style={{ color: 'var(--text-tertiary)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(post.created_at)}</span>
          </div>
        </div>

        {/* Tip button */}
        {!isOwn && post.profiles?.id && (
          <TipButton recipientUserId={post.profiles.id} recipientUsername={post.profiles.username} />
        )}
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {post.content}
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

      {/* Image */}
      {post.media_url && post.media_type === 'image' && (
        <div className="px-4 pb-3">
          <img src={post.media_url} className="w-full rounded-2xl object-cover max-h-80" alt="" style={{ border: '1px solid var(--border)' }} />
        </div>
      )}

      {/* Voice note */}
      {post.media_url && post.media_type === 'audio' && (
        <div className="mx-4 mb-3 px-4 py-3 rounded-2xl flex items-center gap-3" style={{ background: 'linear-gradient(135deg,rgba(255,107,107,0.1),rgba(168,85,247,0.1))' }}>
          <button
            onClick={toggleAudio}
            className="w-9 h-9 rounded-full text-white flex items-center justify-center flex-shrink-0 transition-transform active:scale-90"
            style={{ background: 'var(--grad-brand)' }}
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
          <div className="flex-1 flex gap-0.5 items-center h-8">
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full"
                style={{
                  height: `${20 + Math.sin(i * 0.8) * 14}px`,
                  background: isPlaying ? 'var(--grad-brand)' : 'var(--surface-3)',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--nia-violet)' }}>Voice</span>
          <audio ref={audioRef} src={post.media_url} onEnded={() => setIsPlaying(false)} className="hidden" />
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center gap-1 px-3 py-2" style={{ borderTop: '1px solid var(--border)' }}>
        {/* Like */}
        <button
          onClick={toggleLike}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-90"
          style={isLiked ? { background: 'rgba(239,68,68,0.08)' } : {}}
        >
          <Heart
            size={18}
            fill={isLiked ? '#ef4444' : 'none'}
            style={{ color: isLiked ? '#ef4444' : 'var(--text-tertiary)' }}
            className={heartAnim ? 'heart-pop' : ''}
          />
          <span className="text-sm font-semibold" style={{ color: isLiked ? '#ef4444' : 'var(--text-tertiary)' }}>
            {likeCount > 0 ? likeCount : ''}
          </span>
        </button>

        {/* Comment */}
        <button
          onClick={loadComments}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-90"
          style={showComments ? { background: 'rgba(168,85,247,0.08)' } : {}}
        >
          <MessageCircle size={18} style={{ color: showComments ? 'var(--nia-violet)' : 'var(--text-tertiary)' }} />
          <span className="text-sm font-semibold" style={{ color: showComments ? 'var(--nia-violet)' : 'var(--text-tertiary)' }}>
            {(post.comments?.length ?? 0) > 0 ? post.comments.length : ''}
          </span>
        </button>

        {/* Share */}
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-90">
          <Share2 size={18} style={{ color: 'var(--text-tertiary)' }} />
        </button>

        {/* Translate */}
        {post.content && (
          <button
            onClick={handleTranslate}
            disabled={translating}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-90"
            style={translation ? { background: 'rgba(78,205,196,0.1)' } : {}}
          >
            {translating
              ? <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
              : <Languages size={16} style={{ color: translation ? 'var(--nia-sky)' : 'var(--text-tertiary)' }} />
            }
          </button>
        )}
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="pt-3 space-y-3">
            {loadingComments && (
              <div className="flex gap-2">
                <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5"><div className="skeleton h-3 w-1/3 rounded" /><div className="skeleton h-3 w-3/4 rounded" /></div>
              </div>
            )}
            {comments.map(c => (
              <div key={c.id} className="flex gap-2.5 anim-up">
                <Link href={`/profile/${c.profiles?.id}`} className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs" style={{ background: 'var(--grad-cool)' }}>
                    {c.profiles?.avatar_url
                      ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                      : c.profiles?.username?.[0]?.toUpperCase()
                    }
                  </div>
                </Link>
                <div className="flex-1 px-3 py-2 rounded-2xl rounded-tl-sm" style={{ background: 'var(--surface-2)' }}>
                  <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--nia-violet)' }}>@{c.profiles?.username}</p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{c.content}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && !loadingComments && (
              <p className="text-sm text-center py-2" style={{ color: 'var(--text-tertiary)' }}>No comments yet — be first! 👋</p>
            )}
          </div>

          {currentUserId && (
            <div className="flex gap-2 pt-1">
              <input
                ref={commentRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
                placeholder="Add a comment…"
                className="input flex-1 py-2.5 text-sm"
              />
              <button
                onClick={submitComment}
                disabled={!newComment.trim() || posting}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-white transition-all active:scale-90 disabled:opacity-40"
                style={{ background: 'var(--grad-brand)' }}
              >
                {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
