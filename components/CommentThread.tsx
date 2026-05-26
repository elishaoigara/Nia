'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, MoreHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CommentThreadProps {
  comments:      any[]
  currentUserId: string
  postId:        string
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60)    return `${s}s`
  if (s < 3600)  return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function CommentRow({
  comment, isLast, currentUserId,
}: {
  comment: any; isLast: boolean; currentUserId: string
}) {
  const supabase  = createClient()
  const profile   = comment.profiles
  const likesList = (comment.likes ?? []) as any[]

  const [liked,     setLiked]     = useState(() => likesList.some(l => l.user_id === currentUserId))
  const [likeCount, setLikeCount] = useState(likesList.length)

  async function toggleLike() {
    if (liked) {
      setLiked(false); setLikeCount(c => c - 1)
      await supabase.from('comment_likes').delete()
        .eq('comment_id', comment.id).eq('user_id', currentUserId)
    } else {
      setLiked(true); setLikeCount(c => c + 1)
      await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: currentUserId })
    }
  }

  const initials = profile?.username?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="comment-row">
      {/* Left: avatar + line */}
      <div className="comment-left">
        <Link href={`/profile/${profile?.id}`} className="comment-avatar">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={profile.username} />
            : initials
          }
        </Link>
        {!isLast && <div className="comment-line" />}
      </div>

      {/* Right: content */}
      <div className="comment-body">
        <div className="comment-meta">
          <Link href={`/profile/${profile?.id}`} className="comment-username">
            {profile?.username ?? 'unknown'}
          </Link>
          <span className="comment-time">{timeAgo(comment.created_at)}</span>
          <button
            style={{
              marginLeft: 'auto', flexShrink: 0,
              width: 26, height: 26, borderRadius: '50%',
              border: 'none', background: 'none', cursor: 'pointer',
              color: 'var(--text-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="More"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>

        <p className="comment-text">{comment.content}</p>

        <div className="comment-actions">
          <button
            className={`comment-action-btn${liked ? ' liked' : ''}`}
            onClick={toggleLike}
            aria-label="Like comment"
          >
            <Heart size={15} strokeWidth={liked ? 0 : 1.75} fill={liked ? '#f43f5e' : 'none'} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          <button className="comment-action-btn" aria-label="Reply">
            Reply
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CommentThread({ comments, currentUserId, postId }: CommentThreadProps) {
  return (
    <div className="comment-section">
      <div className="comment-section-label">
        {comments.length} {comments.length === 1 ? 'reply' : 'replies'}
      </div>
      {comments.map((comment, i) => (
        <CommentRow
          key={comment.id}
          comment={comment}
          isLast={i === comments.length - 1}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}