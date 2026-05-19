'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, MoreHorizontal } from 'lucide-react'

interface CommentThreadProps {
  comments: any[]
  currentUserId: string
  postId: string
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60)    return `${s}s`
  if (s < 3600)  return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function CommentRow({ comment, isLast, currentUserId }: { comment: any; isLast: boolean; currentUserId: string }) {
  const profile = comment.profiles
  const likesList = comment.likes ?? []
  const [liked, setLiked] = useState(likesList.some((l: any) => l.user_id === currentUserId))
  const [likeCount, setLikeCount] = useState(likesList.length)

  return (
    <div className="comment-row">
      {/* Left: avatar + thread line */}
      <div className="comment-left">
        <Link href={`/profile/${profile?.id}`} className="comment-avatar">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={profile?.username} />
            : (profile?.username?.[0]?.toUpperCase() ?? '?')
          }
        </Link>
        {/* Only show connecting line if not the last comment */}
        {!isLast && <div className="comment-line" />}
      </div>

      {/* Right: content */}
      <div className="comment-right">
        <div className="comment-meta">
          <Link href={`/profile/${profile?.id}`} className="comment-username" style={{ textDecoration: 'none' }}>
            {profile?.username ?? 'unknown'}
          </Link>
          <span className="comment-time">{timeAgo(comment.created_at)}</span>
          <button className="more-btn" style={{ marginLeft: 'auto', width: 28, height: 28 }} aria-label="More">
            <MoreHorizontal size={15} />
          </button>
        </div>

        <p className="comment-body">{comment.content}</p>

        <div className="comment-actions">
          <button
            className={`comment-action-btn ${liked ? 'liked' : ''}`}
            onClick={() => {
              setLiked((l: boolean) => !l)
              setLikeCount((c: number) => liked ? c - 1 : c + 1)
            }}
            aria-label="Like comment"
          >
            <Heart size={16} strokeWidth={liked ? 0 : 1.75} fill={liked ? '#e0245e' : 'none'} />
            {likeCount > 0 && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{likeCount}</span>}
          </button>
          <button className="comment-action-btn" aria-label="Reply">
            <span style={{ fontSize: 12 }}>Reply</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CommentThread({ comments, currentUserId, postId }: CommentThreadProps) {
  return (
    <div className="comment-thread" style={{ borderTop: '1px solid var(--divider)' }}>
      {/* Section label */}
      <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)' }}>
          {comments.length} {comments.length === 1 ? 'reply' : 'replies'}
        </span>
      </div>

      {/* Comment rows with connecting lines */}
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
