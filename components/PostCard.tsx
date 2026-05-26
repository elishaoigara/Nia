// components/PostCard.tsx
'use client';

<<<<<<< HEAD
import React, { useState } from 'react';
import Link from 'next/link';
import { ThumbsUp, MessageCircle, Share2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PostCardProps {
  post: any;
  currentUserId: string;
  showThreadLine?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId, showThreadLine }) => {
  const supabase = createClient();

  const [likes, setLikes] = useState(post.likes?.length || 0);
  const [liked, setLiked] = useState(
    post.likes?.some((l: any) => l.user_id === currentUserId) || false
  );

  const handleLike = async () => {
    if (liked) {
      await supabase
        .from('likes')
        .delete()
        .match({ post_id: post.id, user_id: currentUserId });
      setLikes((c: number) => c - 1);
      setLiked(false);
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId });
      setLikes((c: number) => c + 1);
      setLiked(true);
    }
  };

  const profile = post.profiles;

  return (
    <div className="card p-4 space-y-3 relative">
      {showThreadLine && (
        <div className="absolute left-8 top-12 bottom-0 w-0.5 bg-[var(--border)] -z-10" />
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <Link href={`/profile/${profile?.id}`} className="shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--grad-brand)] flex items-center justify-center text-white font-bold">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              profile?.username?.[0]?.toUpperCase() ?? '?'
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${profile?.id}`} className="font-bold hover:underline">
              {profile?.username}
            </Link>
            <span className="text-xs text-[var(--text-tertiary)]">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>

          <p className="mt-1 text-sm whitespace-pre-wrap">{post.content}</p>

          {/* Media */}
          {post.media_url && (
            <div className="mt-2 rounded-xl overflow-hidden border border-[var(--border)]">
              {post.media_type === 'video' ? (
                <video src={post.media_url} controls className="w-full max-h-96" />
              ) : (
                <img src={post.media_url} alt="Post media" className="w-full max-h-96 object-cover" />
              )}
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-6 mt-3 text-[var(--text-tertiary)]">
            <button onClick={handleLike} className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-[var(--nia-coral)]' : 'hover:text-[var(--nia-coral)]'} `}>
              <ThumbsUp size={18} fill={liked ? 'currentColor' : 'none'} />
              <span>{likes}</span>
            </button>
            <Link href={`/posts/${post.id}`} className="flex items-center gap-1.5 text-sm hover:text-[var(--nia-violet)] transition-colors">
              <MessageCircle size={18} />
              <span>{post.comments?.length || 0}</span>
            </Link>
            <button className="flex items-center gap-1.5 text-sm hover:text-[var(--nia-mint)] transition-colors">
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
=======
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Repeat2, Send, MoreHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import MediaLightbox from '@/components/MediaLightbox'
import VideoPlayer from '@/components/VideoPlayer'

interface PostCardProps {
  post: any
  currentUserId: string
  showLine?: boolean  // draw the vertical connector to comments below
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60)     return `${s}s`
  if (s < 3600)   return `${Math.floor(s / 60)}m`
  if (s < 86400)  return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

/** Wrap #hashtags and @mentions with a coloured span */
function richText(text: string) {
  return text.replace(/(#\w+|@\w+)/g, '<span class="tag-hl">$1</span>')
}

export default function PostCard({ post, currentUserId, showLine = false }: PostCardProps) {
  const supabase    = createClient()
  const profile     = post.profiles
  const likesList   = (post.likes    ?? []) as any[]
  const commentList = (post.comments ?? []) as any[]
  const repostList  = (post.reposts  ?? []) as any[]

  const [liked,       setLiked]      = useState(() => likesList.some((l) => l.user_id === currentUserId))
  const [likeCount,   setLikeCount]  = useState(likesList.length)
  const [reposted,    setReposted]   = useState(() => repostList.some((r) => r.user_id === currentUserId))
  const [lightboxIdx, setLightbox]   = useState<number | null>(null)

  const commentCount = commentList.length

  /* ── Build media items array ─────────────────────────────── */
  // CreatePost stores: media_url (string) + media_type ('image'|'video'|'audio')
  // and extra_media (array of {url, type}) for the 2nd slot.
  type MediaItem = { url: string; type: 'image' | 'video' }
  const mediaItems: MediaItem[] = []

  if (post.media_url && (post.media_type === 'image' || post.media_type === 'video')) {
    mediaItems.push({ url: post.media_url, type: post.media_type as 'image' | 'video' })
  }
  if (Array.isArray(post.extra_media)) {
    for (const em of post.extra_media) {
      if (em?.url && (em.type === 'image' || em.type === 'video')) {
        mediaItems.push({ url: em.url, type: em.type })
      }
    }
  }

  /* ── Like toggle ─────────────────────────────────────────── */
  const toggleLike = useCallback(async () => {
    if (liked) {
      setLiked(false); setLikeCount((c) => c - 1)
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUserId)
    } else {
      setLiked(true); setLikeCount((c) => c + 1)
      await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId })
    }
  }, [liked, post.id, currentUserId, supabase])

  /* ── Repost toggle ───────────────────────────────────────── */
  const toggleRepost = useCallback(async () => {
    if (reposted) {
      setReposted(false)
      await supabase.from('reposts').delete().eq('post_id', post.id).eq('user_id', currentUserId)
    } else {
      setReposted(true)
      await supabase.from('reposts').insert({ post_id: post.id, user_id: currentUserId })
    }
  }, [reposted, post.id, currentUserId, supabase])

  /* ── Avatar fallback ─────────────────────────────────────── */
  const initials = profile?.username?.[0]?.toUpperCase() ?? '?'
  const hasLine  = showLine || commentCount > 0

  return (
    <>
      <article className="post-row">

        {/* ── Left column ───────────────────────────────── */}
        <div className="post-left">
          <Link href={`/profile/${profile?.id}`} className="post-avatar">
            <div className="post-avatar-inner">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={profile.username} />
                : initials
              }
            </div>
          </Link>

          {hasLine && <div className="post-line" />}

          {/* Mini reply faces below line */}
          {commentCount > 0 && (
            <div className="post-reply-faces">
              {commentList.slice(0, 2).map((c: any, i: number) => (
                <div key={c.id ?? i} className="post-reply-face">
                  {c.profiles?.avatar_url
                    ? <img src={c.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : c.profiles?.username?.[0]?.toUpperCase() ?? '?'
                  }
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right column ──────────────────────────────── */}
        <div className="post-body">

          {/* Header */}
          <div className="post-header">
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Link href={`/profile/${profile?.id}`} className="post-username">
                {profile?.username ?? 'unknown'}
              </Link>
              {post.circles?.name && (
                <span className="post-circle-tag">{post.circles.name}</span>
              )}
              <span className="post-time">{timeAgo(post.created_at)}</span>
            </div>
            <button
              className="tap-sm"
              style={{
                flexShrink: 0,
                width: 30, height: 30,
                borderRadius: '50%',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-tertiary)',
              }}
              aria-label="More"
            >
              <MoreHorizontal size={17} />
            </button>
          </div>

          {/* Text */}
          {post.content && (
            <div
              className="post-text"
              dangerouslySetInnerHTML={{ __html: richText(post.content) }}
            />
          )}

          {/* ── Media ──────────────────────────────────── */}
          {mediaItems.length > 0 && (
            <div className={`post-media ${mediaItems.length === 1 ? 'single' : 'dual'}`}>
              {mediaItems.map((item, i) => (
                <div
                  key={i}
                  style={{ position: 'relative', cursor: 'pointer' }}
                  onClick={() => setLightbox(i)}
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt="Post media"
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <VideoPlayer src={item.url} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Audio post */}
          {post.media_type === 'audio' && post.media_url && (
            <audio
              src={post.media_url}
              controls
              style={{
                width: '100%',
                marginBottom: 10,
                borderRadius: 12,
                accentColor: 'var(--nia-violet)',
              }}
            />
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
                  padding: '11px 14px',
                  borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                  fontSize: 14,
                  cursor: 'pointer',
                }}>
                  {typeof opt === 'string' ? opt : opt.text}
                </div>
              ))}
            </div>
          )}

          {/* ── Action bar ─────────────────────────────── */}
          <div className="post-actions">
            <button
              className={`post-action-btn${liked ? ' liked' : ''}`}
              onClick={toggleLike}
              aria-label="Like"
            >
              <Heart size={20} strokeWidth={liked ? 0 : 1.75} fill={liked ? '#f43f5e' : 'none'} />
            </button>

            <Link
              href={`/posts/${post.id}`}
              className="post-action-btn"
              aria-label="Reply"
            >
              <MessageCircle size={20} strokeWidth={1.75} />
            </Link>

            <button
              className={`post-action-btn${reposted ? ' reposted' : ''}`}
              onClick={toggleRepost}
              aria-label="Repost"
            >
              <Repeat2 size={20} strokeWidth={1.75} />
            </button>

            <button className="post-action-btn" aria-label="Share">
              <Send size={19} strokeWidth={1.75} />
            </button>
          </div>

          {/* Stat text */}
          {(likeCount > 0 || commentCount > 0) && (
            <div className="post-stat">
              {commentCount > 0 && (
                <Link href={`/posts/${post.id}`}>
                  {commentCount} {commentCount === 1 ? 'reply' : 'replies'}
                </Link>
              )}
              {commentCount > 0 && likeCount > 0 && <span> · </span>}
              {likeCount > 0 && (
                <span>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>
              )}
            </div>
          )}
        </div>
      </article>

      {/* Lightbox */}
      {lightboxIdx !== null && mediaItems.length > 0 && (
        <MediaLightbox
          items={mediaItems}
          startIndex={lightboxIdx}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  )
}
>>>>>>> 70a68ce (fix:331666133166613316661331666133888)
