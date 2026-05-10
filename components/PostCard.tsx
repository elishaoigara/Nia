'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, Share2, Languages, Loader2, Play, Pause, Send, Repeat2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TipButton from '@/components/TipButton'
import PollCard from '@/components/PollCard'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

const REACTIONS = ['❤️','😂','🔥','😮','👏','😢']

export default function PostCard({ post, currentUserId }: any) {
  const supabase = createClient()
  const router = useRouter()

  // Reactions: group by emoji
  const reactionCounts: Record<string, number> = {}
  const myReaction: string | null = post.reactions?.find((r: any) => r.user_id === currentUserId)?.emoji ?? null
  post.reactions?.forEach((r: any) => { reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1 })

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
  const [reposted, setReposted] = useState(false)
  const [repostCount, setRepostCount] = useState(post.reposts?.length ?? 0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const commentRef = useRef<HTMLInputElement>(null)

  const totalReactions = Object.values(localReactions).reduce((a, b) => a + b, 0)

  async function handleReaction(emoji: string) {
    if (!currentUserId) return
    setShowReactionPicker(false)
    const newCounts = { ...localReactions }

    if (activeReaction === emoji) {
      // remove
      await supabase.from('reactions').delete().match({ post_id: post.id, user_id: currentUserId })
      newCounts[emoji] = Math.max((newCounts[emoji] ?? 1) - 1, 0)
      setActiveReaction(null)
    } else {
      // replace or add
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
    if (!currentUserId || reposted) return
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
      const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: post.content, targetLang: 'en' }) })
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
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  function toggleAudio() {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause() } else { audioRef.current.play() }
    setIsPlaying(!isPlaying)
  }

  const isOwn = post.profiles?.id === currentUserId
  const displayName = post.is_anonymous ? 'Anonymous 🎭' : `@${post.profiles?.username}`
  const displayHref = post.is_anonymous ? '#' : `/profile/${post.profiles?.id}`

  // Top 3 reactions to show inline
  const topReactions = Object.entries(localReactions)
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  return (
    <article className="card card-hover overflow-hidden anim-up">
      {/* Repost indicator */}
      {post.repost_of && (
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-1" style={{ color: 'var(--text-tertiary)' }}>
          <Repeat2 size={14} />
          <span className="text-xs font-semibold">Reposted</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <Link href={post.is_anonymous ? '#' : `/profile/${post.profiles?.id}`} className="flex-shrink-0">
          <div className="avatar-ring">
            <div className="w-10 h-10 rounded-full overflow-hidden" style={{ background: post.is_anonymous ? 'linear-gradient(135deg,#555,#333)' : 'var(--grad-brand)' }}>
              {!post.is_anonymous && post.profiles?.avatar_url
                ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                    {post.is_anonymous ? '🎭' : post.profiles?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
              }
            </div>
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={displayHref} className="font-bold text-sm hover:underline">
              {displayName}
            </Link>
            {post.circles && (
              <Link href={`/circles/${post.circles.slug}`} className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,rgba(255,107,107,0.15),rgba(168,85,247,0.15))', color: 'var(--nia-violet)' }}>
                {post.circles.name}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {!post.is_anonymous && <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{post.profiles?.university?.split(' ').slice(0, 2).join(' ')}</span>}
            {!post.is_anonymous && <span style={{ color: 'var(--text-tertiary)' }}>·</span>}
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(post.created_at)}</span>
          </div>
        </div>

        {!isOwn && !post.is_anonymous && post.profiles?.id && (
          <TipButton recipientUserId={post.profiles.id} recipientUsername={post.profiles.username} />
        )}
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>{post.content}</p>
          {translation && (
            <div className="mt-2 text-sm italic px-3 py-2.5 rounded-xl" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', borderLeft: '3px solid var(--nia-violet)' }}>
              {translation}
            </div>
          )}
        </div>
      )}

      {/* Poll */}
      {post.poll && (
        <PollCard poll={post.poll} currentUserId={currentUserId} />
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
          <button onClick={toggleAudio} className="w-9 h-9 rounded-full text-white flex items-center justify-center flex-shrink-0" style={{ background: 'var(--grad-brand)' }}>
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
          <div className="flex-1 flex gap-0.5 items-center h-8">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className="flex-1 rounded-full" style={{ height: `${20 + Math.sin(i * 0.8) * 14}px`, background: isPlaying ? 'var(--grad-brand)' : 'var(--surface-3)', transition: 'background 0.3s' }} />
            ))}
          </div>
          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--nia-violet)' }}>Voice</span>
          <audio ref={audioRef} src={post.media_url} onEnded={() => setIsPlaying(false)} className="hidden" />
        </div>
      )}

      {/* Reaction summary */}
      {topReactions.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 pb-2">
          <div className="flex items-center gap-0.5 px-2 py-1 rounded-full" style={{ background: 'var(--surface-2)' }}>
            {topReactions.map(([emoji]) => <span key={emoji} className="text-sm">{emoji}</span>)}
            <span className="text-xs font-bold ml-1" style={{ color: 'var(--text-secondary)' }}>{totalReactions}</span>
          </div>
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center gap-1 px-3 py-2 relative" style={{ borderTop: '1px solid var(--border)' }}>
        {/* Reaction button */}
        <div className="relative">
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-90"
            style={activeReaction ? { background: 'rgba(239,68,68,0.08)' } : {}}
          >
            <span className="text-lg leading-none">{activeReaction ?? '🤍'}</span>
            {totalReactions > 0 && <span className="text-sm font-semibold" style={{ color: activeReaction ? '#ef4444' : 'var(--text-tertiary)' }}>{totalReactions}</span>}
          </button>

          {showReactionPicker && (
            <div
              className="absolute bottom-12 left-0 flex gap-1 p-2 rounded-2xl z-20 anim-pop"
              style={{ background: 'var(--surface-0)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}
            >
              {REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-xl w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-75 hover:scale-125"
                  style={activeReaction === emoji ? { background: 'rgba(168,85,247,0.12)' } : {}}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comment */}
        <button onClick={loadComments} className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-90" style={showComments ? { background: 'rgba(168,85,247,0.08)' } : {}}>
          <MessageCircle size={18} style={{ color: showComments ? 'var(--nia-violet)' : 'var(--text-tertiary)' }} />
          <span className="text-sm font-semibold" style={{ color: showComments ? 'var(--nia-violet)' : 'var(--text-tertiary)' }}>
            {(post.comments?.length ?? 0) > 0 ? post.comments.length : ''}
          </span>
        </button>

        {/* Repost */}
        <button
          onClick={handleRepost}
          disabled={isOwn}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-90 disabled:opacity-30"
          style={reposted ? { background: 'rgba(107,203,119,0.1)' } : {}}
        >
          <Repeat2 size={18} style={{ color: reposted ? 'var(--nia-mint)' : 'var(--text-tertiary)' }} />
          {repostCount > 0 && <span className="text-sm font-semibold" style={{ color: reposted ? 'var(--nia-mint)' : 'var(--text-tertiary)' }}>{repostCount}</span>}
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-90" style={copied ? { background: 'rgba(107,203,119,0.1)' } : {}}>
          <Share2 size={18} style={{ color: copied ? 'var(--nia-mint)' : 'var(--text-tertiary)' }} />
          {copied && <span className="text-xs font-semibold" style={{ color: 'var(--nia-mint)' }}>Copied!</span>}
        </button>

        {/* Translate */}
        {post.content && (
          <button onClick={handleTranslate} disabled={translating} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-90" style={translation ? { background: 'rgba(78,205,196,0.1)' } : {}}>
            {translating ? <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} /> : <Languages size={16} style={{ color: translation ? 'var(--nia-sky)' : 'var(--text-tertiary)' }} />}
          </button>
        )}
      </div>

      {/* Comments */}
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
                    {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : c.profiles?.username?.[0]?.toUpperCase()}
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
              <input ref={commentRef} value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()} placeholder="Add a comment…" className="input flex-1 py-2.5 text-sm" />
              <button onClick={submitComment} disabled={!newComment.trim() || posting} className="w-10 h-10 flex items-center justify-center rounded-xl text-white transition-all active:scale-90 disabled:opacity-40" style={{ background: 'var(--grad-brand)' }}>
                {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
