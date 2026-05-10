'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, MessageCircle, Repeat2, Send, Languages, Loader2, Play, Pause } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function PostCard({ post, currentUserId }: any) {
  const supabase = createClient()
  const router = useRouter()
  const liked = post.likes?.some((l: any) => l.user_id === currentUserId)
  const [isLiked, setIsLiked] = useState(liked)
  const [likeCount, setLikeCount] = useState(post.likes?.length ?? 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [posting, setPosting] = useState(false)

  // Translation
  const [translation, setTranslation] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)
  const [translationLang, setTranslationLang] = useState<'en' | 'sw'>('sw')

  // Audio
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function toggleLike() {
    if (!currentUserId) return
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
      .select('*, profiles:user_id (username, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setComments(data ?? [])
    setLoadingComments(false)
    setShowComments(true)
  }

  async function submitComment() {
    if (!newComment.trim() || !currentUserId) return
    setPosting(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: currentUserId, content: newComment.trim() })
      .select('*, profiles:user_id (username, avatar_url)')
      .single()
    if (!error && data) {
      setComments(prev => [...prev, data])
      setNewComment('')
    }
    setPosting(false)
    router.refresh()
  }

  async function handleTranslate() {
    if (translation) {
      // Toggle off
      setTranslation(null)
      return
    }
    if (!post.content) return
    setTranslating(true)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: post.content, targetLang: translationLang }),
      })
      const data = await res.json()
      setTranslation(data.translation ?? null)
      // Toggle target lang for next click
      setTranslationLang(translationLang === 'sw' ? 'en' : 'sw')
    } catch {
      // silent
    } finally {
      setTranslating(false)
    }
  }

  function toggleAudio() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    return `${Math.floor(seconds / 86400)}d`
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/profile/${post.profiles?.id}`}>
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 font-semibold text-sm flex-shrink-0">
            {post.profiles?.avatar_url
              ? <img src={post.profiles.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
              : post.profiles?.username?.[0]?.toUpperCase() ?? '?'
            }
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${post.profiles?.id}`} className="text-sm font-semibold hover:underline truncate">
              @{post.profiles?.username}
            </Link>
            {post.circles && (
              <Link href={`/circles/${post.circles.slug}`} className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-600 px-2 py-0.5 rounded-full hover:bg-purple-100 transition-colors">
                {post.circles.name}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <span>{post.profiles?.university}</span>
            <span>·</span>
            <span>{timeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
      )}

      {/* Translation */}
      {translation && (
        <div className="text-sm text-zinc-500 dark:text-zinc-400 italic bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2 border border-zinc-100 dark:border-zinc-700">
          {translation}
        </div>
      )}

      {/* Image */}
      {post.media_url && post.media_type === 'image' && (
        <img src={post.media_url} className="rounded-xl w-full object-cover max-h-80" alt="" />
      )}

      {/* Audio voice note */}
      {post.media_url && post.media_type === 'audio' && (
        <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl px-4 py-3">
          <button
            onClick={toggleAudio}
            className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white transition-colors flex-shrink-0"
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
          <div className="flex-1 h-1 bg-purple-200 dark:bg-purple-900 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full w-0 transition-all" />
          </div>
          <span className="text-xs text-purple-500 font-mono">Voice</span>
          <audio
            ref={audioRef}
            src={post.media_url}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-5 pt-1">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            isLiked ? 'text-red-500' : 'text-zinc-400 hover:text-red-400'
          }`}
        >
          <Heart size={17} fill={isLiked ? 'currentColor' : 'none'} />
          <span>{likeCount}</span>
        </button>

        <button
          onClick={loadComments}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-blue-400 transition-colors"
        >
          <MessageCircle size={17} />
          <span>{post.comments?.length ?? comments.length}</span>
        </button>

        <button className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-green-400 transition-colors">
          <Repeat2 size={17} />
        </button>

        {post.content && (
          <button
            onClick={handleTranslate}
            disabled={translating}
            className={`flex items-center gap-1 text-sm transition-colors ml-auto ${
              translation ? 'text-blue-500' : 'text-zinc-400 hover:text-blue-400'
            }`}
            title={translationLang === 'sw' ? 'Translate to Swahili' : 'Translate to English'}
          >
            {translating
              ? <Loader2 size={15} className="animate-spin" />
              : <Languages size={15} />
            }
          </button>
        )}
      </div>

      {/* Comments */}
      {showComments && (
        <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {loadingComments && <p className="text-xs text-zinc-400">Loading comments…</p>}

          {comments.map(comment => (
            <div key={comment.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 text-xs font-semibold flex-shrink-0">
                {comment.profiles?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">@{comment.profiles?.username}</p>
                <p className="text-sm">{comment.content}</p>
              </div>
            </div>
          ))}

          {comments.length === 0 && !loadingComments && (
            <p className="text-xs text-zinc-400">No comments yet. Be first.</p>
          )}

          {currentUserId && (
            <div className="flex gap-2 pt-1">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                placeholder="Write a comment…"
                className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={submitComment}
                disabled={!newComment.trim() || posting}
                className="p-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl transition-colors"
              >
                <Send size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
