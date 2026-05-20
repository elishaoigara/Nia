'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, MoreHorizontal, MessageSquare } from 'lucide-react'

interface CommentThreadProps {
  comments: any[]
  currentUserId: string
  postId: string
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function CommentRow({ comment, isLast, currentUserId }: { comment: any; isLast: boolean; currentUserId: string }) {
  const profile = comment.profiles
  const likesList = comment.likes ?? []
  const [liked, setLiked] = useState(likesList.some((l: any) => l.user_id === currentUserId))
  const [likeCount, setLikeCount] = useState(likesList.length)

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    // Explicitly typed 'l' as boolean and 'c' as number to satisfy TS rules
    setLiked((l: boolean) => !l)
    setLikeCount((c: number) => (liked ? c - 1 : c + 1))
  }

  return (
    <div className="flex gap-3 px-4 py-3 relative group">
      
      {/* Left Axis: Avatar and Core Nested Thread Connector Line */}
      <div className="flex flex-col items-center shrink-0 relative">
        <Link 
          href={`/profile/${profile?.id}`} 
          className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs text-white select-none transition-transform active:scale-95"
          style={{ background: 'var(--grad-brand)' }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile?.username} className="w-full h-full object-cover" />
          ) : (
            profile?.username?.[0]?.toUpperCase() ?? '?'
          )}
        </Link>
        
        {/* Thread connecting tracker vector - Updated to canonical -bottom-3 */}
        {!isLast && (
          <div 
            className="absolute top-9 -bottom-3 w-0.5 left-1/2 -translate-x-1/2 opacity-60" 
            style={{ backgroundColor: 'var(--border)' }}
          />
        )}
      </div>

      {/* Right Axis: Context Container */}
      <div className="flex-1 min-w-0 space-y-1">
        
        {/* Header Block Metas */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link 
              href={`/profile/${profile?.id}`} 
              className="font-bold text-sm hover:text-(--nia-violet) transition-colors truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              @{profile?.username ?? 'unknown'}
            </Link>
            <span className="inline-block w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--border)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              {timeAgo(comment.created_at)}
            </span>
          </div>

          <button 
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-90 md:opacity-0 group-hover:opacity-100" 
            style={{ color: 'var(--text-tertiary)', background: 'var(--surface-1)' }}
            aria-label="More options"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>

        {/* Comment Message Body - Updated to wrap-break-word */}
        <p className="text-[14px] leading-relaxed wrap-break-word" style={{ color: 'var(--text-secondary)' }}>
          {comment.content}
        </p>

        {/* Interactive Option Footer Layout */}
        <div className="flex items-center gap-4 pt-1">
          {/* Like Utility Node */}
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 transition-colors group/like"
            aria-label="Like comment"
          >
            <div className={`p-1 rounded-lg transition-colors ${liked ? 'bg-rose-500/10' : 'group-hover/like:bg-rose-500/10'}`}>
              <Heart 
                size={14} 
                strokeWidth={liked ? 0 : 2} 
                fill={liked ? '#f43f5e' : 'currentColor'} 
                className={liked ? 'text-rose-500 animate-pop' : 'text-slate-400 group-hover/like:text-rose-500'}
              />
            </div>
            {likeCount > 0 && (
              <span className={`text-xs font-semibold ${liked ? 'text-rose-500' : ''}`} style={{ color: liked ? undefined : 'var(--text-tertiary)' }}>
                {likeCount}
              </span>
            )}
          </button>

          {/* Reply Interface Trigger Utility Node - Updated to syntax group-hover/reply:bg-(--surface-2) */}
          <button 
            className="flex items-center gap-1.5 text-slate-400 hover:text-(--nia-violet) transition-colors group/reply" 
            aria-label="Reply to comment"
          >
            <div className="p-1 rounded-lg group-hover/reply:bg-(--surface-2) transition-colors">
              <MessageSquare size={14} strokeWidth={2} />
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--text-tertiary)' }}>Reply</span>
          </button>
        </div>

      </div>
    </div>
  )
}

export default function CommentThread({ comments, currentUserId, postId }: CommentThreadProps) {
  return (
    <div className="w-full border-t flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--surface-0)' }}>
      
      {/* Thread Metric Banner Header Label */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-2 select-none">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          {comments.length} {comments.length === 1 ? 'reply' : 'replies'}
        </span>
      </div>

      {/* Structured Core Map Wrapper Loop Container */}
      <div className="flex flex-col">
        {comments.map((comment, i) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            isLast={i === comments.length - 1}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  )
}