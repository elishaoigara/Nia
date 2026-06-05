'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, MoreHorizontal, Play, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CommentMedia {
  url: string;
  type: 'image' | 'video';
}

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

function CommentMediaGrid({ media }: { media: CommentMedia[] }) {
  if (media.length === 0) return null

  if (media.length === 1) {
    const m = media[0]
    return (
      <div className="comment-media">
        {m.type === 'video' ? (
          <div style={{ position: 'relative' }}>
            <video src={m.url} controls style={{ width: '100%', display: 'block', maxHeight: 240, objectFit: 'cover' }} />
          </div>
        ) : (
          <img src={m.url} alt="" loading="lazy" />
        )}
      </div>
    )
  }

  return (
    <div className="comment-media">
      <div className="comment-media-grid">
        {media.slice(0, 4).map((m, i) => (
          <div key={i} style={{ position: 'relative' }}>
            {m.type === 'video' ? (
              <>
                <video src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.3)',
                }}>
                  <Play size={20} fill="#fff" color="#fff" />
                </div>
              </>
            ) : (
              <img src={m.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CommentRow({
  comment, isLast, currentUserId,
}: {
  comment: any; isLast: boolean; currentUserId: string
}) {
  const supabase  = createClient()
  const router    = useRouter()
  const profile   = comment.profiles
  const likesList = (comment.likes ?? []) as any[]

  const [liked,     setLiked]     = useState(() => likesList.some((l: any) => l.user_id === currentUserId))
  const [likeCount, setLikeCount] = useState(likesList.length)
  const [showMenu,  setShowMenu]  = useState(false)
  const [deleted,   setDeleted]   = useState(false)

  const isOwner = currentUserId === comment.user_id

  // Build media list from comment
  const media: CommentMedia[] = []
  if (comment.media_url && comment.media_type) {
    media.push({ url: comment.media_url, type: comment.media_type })
  }
  if (Array.isArray(comment.extra_media)) {
    media.push(...comment.extra_media)
  }

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

  async function deleteComment() {
    setShowMenu(false)
    await supabase.from('comments').delete().eq('id', comment.id)
    setDeleted(true)
    router.refresh()
  }

  if (deleted) return null

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

          {/* ⋯ menu */}
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <button
              onClick={() => setShowMenu(p => !p)}
              style={{
                width: 26, height: 26, borderRadius: '50%',
                border: 'none', background: 'none', cursor: 'pointer',
                color: 'var(--text-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="More"
            >
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%',
                background: 'var(--surface-1)', border: '1px solid var(--border)',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                zIndex: 30, minWidth: 140, overflow: 'hidden',
              }}>
                {isOwner && (
                  <button
                    onClick={deleteComment}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '9px 14px',
                      border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: 13, color: '#f43f5e', fontFamily: 'inherit',
                    }}
                  >
                    <Trash2 size={13} />
                    Delete reply
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {comment.content !== '' && comment.content && <p className="comment-text">{comment.content}</p>}

        {/* Reply media */}
        {media.length > 0 && <CommentMediaGrid media={media} />}

        <div className="comment-actions">
          <button
            className={`comment-action-btn${liked ? ' liked' : ''}`}
            onClick={toggleLike}
            aria-label="Like comment"
          >
            <Heart size={15} strokeWidth={liked ? 0 : 1.75} fill={liked ? '#f43f5e' : 'none'} />
            {likeCount > 0 && <span>{likeCount}</span>}
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