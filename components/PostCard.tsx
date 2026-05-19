'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Repeat2, Send, MoreHorizontal, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PostCardProps {
  post: any
  currentUserId: string
  showThreadLine?: boolean
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60)    return `${s}s`
  if (s < 3600)  return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

function highlightText(text: string) {
  // Highlight hashtags and @mentions in violet
  return text.replace(/(#\w+|@\w+)/g, '<span class="tag-highlight">$1</span>')
}

export default function PostCard({ post, currentUserId, showThreadLine = false }: PostCardProps) {
  const profile = post.profiles
  const likesList: any[] = post.likes ?? []
  const commentsList: any[] = post.comments ?? []
  const repostsList: any[] = post.reposts ?? []
  const topComments: any[] = commentsList.slice(0, 2)

  const isLiked    = likesList.some((l: any) => l.user_id === currentUserId)
  const isReposted = repostsList.some((r: any) => r.user_id === currentUserId)

  const [liked,      setLiked]      = useState(isLiked)
  const [likeCount,  setLikeCount]  = useState(likesList.length)
  const [reposted,   setReposted]   = useState(isReposted)
  const [repostCount, setRepostCount] = useState(repostsList.length)

  const supabase = createClient()

  const toggleLike = useCallback(async () => {
    if (liked) {
      setLiked(false); setLikeCount(c => c - 1)
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUserId)
    } else {
      setLiked(true); setLikeCount(c => c + 1)
      await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId })
    }
  }, [liked, post.id, currentUserId, supabase])

  const toggleRepost = useCallback(async () => {
    if (reposted) {
      setReposted(false); setRepostCount(c => c - 1)
      await supabase.from('reposts').delete().eq('post_id', post.id).eq('user_id', currentUserId)
    } else {
      setReposted(true); setRepostCount(c => c + 1)
      await supabase.from('reposts').insert({ post_id: post.id, user_id: currentUserId })
    }
  }, [reposted, post.id, currentUserId, supabase])

  const hasComments  = commentsList.length > 0
  const commentCount = commentsList.length

  return (
    <article className="thread-post">
      <div style={{ display: 'flex', gap: 0 }}>

        {/* Left: avatar + thread line */}
        <div className="thread-left">
          <Link href={`/profile/${profile?.id}`} className="thread-avatar">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile?.username} className="w-full h-full object-cover" style={{ borderRadius: '50%', border: '2px solid var(--surface-0)' }} />
              : <div className="thread-avatar-fallback">{profile?.username?.[0]?.toUpperCase() ?? '?'}</div>
            }
          </Link>

          {/* Thread connecting line */}
          {(showThreadLine || hasComments) && (
            <div className="thread-line" />
          )}

          {/* Reply avatars preview at bottom of line */}
          {hasComments && (
            <div className="thread-replies-preview">
              {topComments.slice(0, 2).map((c: any, i: number) => (
                <div key={c.id} className="reply-avatar" style={{ zIndex: 2 - i }}>
                  {c.profiles?.avatar_url
                    ? <img src={c.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : (c.profiles?.username?.[0]?.toUpperCase() ?? '?')
                  }
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: content */}
        <div className="thread-right">

          {/* Header row */}
          <div className="thread-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Link href={`/profile/${profile?.id}`} className="thread-username">
                {profile?.username ?? 'unknown'}
              </Link>
              {/* Verified / circle indicator */}
              {post.circles?.name && (
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--nia-violet)',
                  background: 'rgba(168,85,247,0.10)',
                  borderRadius: 6, padding: '1px 6px',
                  marginLeft: 4,
                }}>
                  {post.circles.name}
                </span>
              )}
              <span className="thread-time">{timeAgo(post.created_at)}</span>
            </div>
            <button className="more-btn" aria-label="More options">
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* Body text */}
          {post.content && (
            <div
              className="thread-body"
              dangerouslySetInnerHTML={{ __html: highlightText(post.content) }}
            />
          )}

          {/* Media */}
          {post.image_url && (
            <div className="thread-media">
              <img src={post.image_url} alt="Post media" loading="lazy" />
            </div>
          )}

          {/* Poll */}
          {post.poll && (
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 14,
              overflow: 'hidden',
              marginBottom: 10,
            }}>
              {post.poll.options?.map((opt: any, i: number) => (
                <div key={i} style={{
                  padding: '12px 16px',
                  borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}>
                  {opt}
                </div>
              ))}
            </div>
          )}

          {/* Action bar */}
          <div className="thread-actions">
            <button
              className={`thread-action-btn ${liked ? 'liked' : ''}`}
              onClick={toggleLike}
              aria-label="Like"
            >
              <Heart size={20} strokeWidth={liked ? 0 : 1.75} fill={liked ? '#e0245e' : 'none'} />
            </button>

            <Link href={`/posts/${post.id}`} className="thread-action-btn" aria-label="Comment">
              <MessageCircle size={20} strokeWidth={1.75} />
            </Link>

            <button
              className={`thread-action-btn ${reposted ? 'reposted' : ''}`}
              onClick={toggleRepost}
              aria-label="Repost"
            >
              <Repeat2 size={20} strokeWidth={1.75} />
            </button>

            <button className="thread-action-btn" aria-label="Share">
              <Send size={19} strokeWidth={1.75} />
            </button>
          </div>

          {/* Stat bar: "N replies · N likes" */}
          {(likeCount > 0 || commentCount > 0) && (
            <div className="thread-stat-bar">
              {commentCount > 0 && (
                <Link href={`/posts/${post.id}`} className="thread-stat-text" style={{ textDecoration: 'none' }}>
                  {commentCount} {commentCount === 1 ? 'reply' : 'replies'}
                </Link>
              )}
              {commentCount > 0 && likeCount > 0 && (
                <span className="thread-stat-text"> · </span>
              )}
              {likeCount > 0 && (
                <span className="thread-stat-text">{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>
              )}
            </div>
          )}

        </div>
      </div>
    </article>
  )
}
