// components/PostCard.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  MoreHorizontal,
  Image,
  Play,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createClient as createClientLocal } from '@/lib/supabase/client';
import MediaLightbox from './MediaLightbox';
import FollowButton from './FollowButton';

/* ── Types ──────────────────────────────────── */

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface PostMedia {
  url: string;
  type: 'image' | 'video';
}

interface CircleInfo {
  id: string;
  name: string;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface PollInfo {
  id: string;
  question: string;
  options: PollOption[];
  ends_at: string;
}

interface PostCardProps {
  post: {
    id: string;
    content: string | null;
    media_url: string | null;
    media_type: string | null;
    extra_media: PostMedia[] | null;
    language: string | null;
    created_at: string;
    user_id: string;
    profiles: Profile | null;
    circles: CircleInfo | null;
    likes_count?: number;
    comments_count?: number;
    lomi_count?: number;
    reposts_count?: number;
    polls: PollInfo[] | null;
  };
  currentUserId?: string | null;
  onDelete?: (postId: string) => void;
  showLine?: boolean;
}

/* ── HTML-escape helper (XSS-safe) ────────────── */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => map[char] || char);
}

/* ── Rich-text renderer (XSS-safe) ─────────────── */
function RichText({ text }: { text: string }) {
  const escaped = escapeHtml(text);
  const html = escaped
    .replace(/\n/g, '<br>')
    .replace(
      /(#[\w\u00C0-\u024F\u1E00-\u1EFF]+)/g,
      '<span class="tag-hl">$1</span>'
    )
    .replace(
      /(@[\w]+)/g,
      '<span class="tag-hl">$1</span>'
    );

  return (
    <p
      className="post-text"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ── Time helper ──────────────────────────────── */
function timeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

/* ── Media grid class helper ─────────────────── */
function mediaGridClass(count: number): string {
  if (count === 1) return 'single';
  if (count === 2) return 'dual';
  if (count === 3) return 'triple';
  if (count === 4) return 'quad';
  if (count === 5) return 'penta';
  return 'single';
}

/* ── Component ───────────────────────────────── */
export default function PostCard({ post, currentUserId, onDelete, showLine }: PostCardProps) {
  const supabase = createClient();
  const router = useRouter();

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count ?? 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count ?? 0);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count ?? 0);
  const [showMenu, setShowMenu] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [initialIsFollowing, setInitialIsFollowing] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const profile = post.profiles;
  const circle = post.circles;

  const allMedia: PostMedia[] = [];

  if (post.media_url && post.media_type) {
    allMedia.push({ url: post.media_url, type: post.media_type as 'image' | 'video' });
  }

  if (post.extra_media && Array.isArray(post.extra_media)) {
    allMedia.push(...post.extra_media);
  }

  /* Check if current user liked this post */
  useEffect(() => {
    if (!currentUserId) return;
    supabase
      .from('likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLiked(true);
      });
  }, [currentUserId, post.id]); // eslint-disable-line

  /* Check if current user is following the post author */
  useEffect(() => {
    if (!currentUserId || !profile?.id || currentUserId === profile.id) return;
    supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUserId)
      .eq('following_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        setInitialIsFollowing(!!data);
      });
  }, [currentUserId, profile?.id]); // eslint-disable-line

  /* Close menu on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  const handleLike = useCallback(async () => {
    if (!currentUserId) return;
    setLiked(prev => !prev);
    setLikesCount(prev => (liked ? prev - 1 : prev + 1));

    if (liked) {
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', currentUserId);
    } else {
      await supabase.from('likes').insert({
        post_id: post.id,
        user_id: currentUserId,
      });
    }
  }, [currentUserId, liked, post.id]); // eslint-disable-line

  const initials = profile?.username?.[0]?.toUpperCase() ?? '?';

  const handlePostClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.post-action-btn') ||
      target.closest('.btn-follow') ||
      target.closest('a')
    ) {
      return;
    }
    router.push(`/posts/${post.id}`);
  };

  return (
    <>
      <article className="post-row" onClick={handlePostClick} style={{ cursor: 'pointer' }}>
        {/* ── Left column ───────────────────── */}
        <div className="post-left">
          <Link
            href={`/profile/${profile?.id ?? '#'}`}
            onClick={e => e.stopPropagation()}
            className="post-avatar"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username ?? ''} />
            ) : (
              <div className="post-avatar-inner">{initials}</div>
            )}
          </Link>
          {showLine && <div className="post-line" />}
        </div>

        {/* ── Body ──────────────────────────── */}
        <div className="post-body">
          {/* Header */}
          <div className="post-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <Link
                href={`/profile/${profile?.id ?? '#'}`}
                className="post-username"
                onClick={e => e.stopPropagation()}
              >
                {profile?.full_name ?? profile?.username ?? 'unknown'}
              </Link>
              {profile?.username && (
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)', marginLeft: 2 }}>
                  @{profile.username}
                </span>
              )}
              <span className="post-time">{timeAgo(post.created_at)}</span>
              {circle && (
                <span className="post-circle-tag">{circle.name}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {currentUserId && currentUserId !== profile?.id && profile && (
                <FollowButton
                  targetUserId={profile.id}
                  currentUserId={currentUserId}
                  initialIsFollowing={initialIsFollowing}
                />
              )}
              <div style={{ position: 'relative' }} ref={menuRef}>
                <button
                  className="post-action-btn"
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(prev => !prev);
                  }}
                  style={{ marginRight: -8 }}
                >
                  <MoreHorizontal size={18} />
                </button>
                {showMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      zIndex: 30,
                      minWidth: 160,
                      overflow: 'hidden',
                    }}
                  >
                    {currentUserId === profile?.id && (
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          setShowMenu(false);
                          await supabase.from('posts').delete().eq('id', post.id);
                          onDelete?.(post.id);
                          router.refresh();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          padding: '10px 16px',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          fontSize: 14,
                          color: '#f43f5e',
                          fontFamily: 'inherit',
                        }}
                      >
                        Delete post
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setShowMenu(false);
                        navigator.clipboard.writeText(
                          `${window.location.origin}/posts/${post.id}`
                        );
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '10px 16px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                      }}
                    >
                      Copy link
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          {post.content && <RichText text={post.content} />}

          {/* Media grid */}
          {allMedia.length > 0 && (
            <div
              className={`post-media ${mediaGridClass(allMedia.length)}`}
              onClick={e => e.stopPropagation()}
            >
              {allMedia.map((m, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setLightboxIndex(i);
                    setLightboxOpen(true);
                  }}
                  style={{ position: 'relative', cursor: 'pointer' }}
                >
                  {m.type === 'video' ? (
                    <>
                      <video src={m.url} />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(0,0,0,0.3)',
                        }}
                      >
                        <Play size={32} fill="#fff" color="#fff" />
                      </div>
                    </>
                  ) : (
                    <img src={m.url} alt={`Post media ${i + 1}`} loading="lazy" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Poll (if any) */}
          {post.polls && post.polls.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {post.polls.map(poll => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  postId={post.id}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}

          {/* Language label */}
          {post.language && post.language !== 'english' && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                marginBottom: 4,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}
            >
              {post.language}
            </div>
          )}

          {/* Stats */}
          {(likesCount > 0 || commentsCount > 0) && (
            <div className="post-stat">
              {likesCount > 0 && (
                <span>
                  {likesCount}{' '}
                  {likesCount === 1 ? 'like' : 'likes'}
                </span>
              )}
              {commentsCount > 0 && likesCount > 0 && ' · '}
              {commentsCount > 0 && (
                <Link
                  href={`/posts/${post.id}`}
                  onClick={e => e.stopPropagation()}
                >
                  {commentsCount}{' '}
                  {commentsCount === 1 ? 'reply' : 'replies'}
                </Link>
              )}
            </div>
          )}

          {/* Action bar */}
          <div className="post-actions">
            <button
              className={`post-action-btn ${liked ? 'liked' : ''}`}
              onClick={handleLike}
            >
              <Heart size={18} />
              {likesCount > 0 && (
                <span className="post-action-count">{likesCount}</span>
              )}
            </button>

            <Link
              href={`/posts/${post.id}`}
              className="post-action-btn"
              onClick={e => e.stopPropagation()}
            >
              <MessageCircle size={18} />
              {commentsCount > 0 && (
                <span className="post-action-count">{commentsCount}</span>
              )}
            </Link>

            <button className="post-action-btn">
              <Repeat2 size={18} />
              {repostsCount > 0 && (
                <span className="post-action-count">{repostsCount}</span>
              )}
            </button>

            <button className="post-action-btn">
              <Share size={18} />
            </button>
          </div>
        </div>
      </article>

      {/* Lightbox */}
      {lightboxOpen && (
        <MediaLightbox
          items={allMedia}
          startIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

/* ── Poll Card sub-component ─────────────────── */
function PollCard({
  poll,
  postId,
  currentUserId,
}: {
  poll: PollInfo;
  postId: string;
  currentUserId?: string | null;
}) {
  const supabase = createClientLocal();
  const [voted, setVoted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!currentUserId) return;
    supabase
      .from('poll_votes')
      .select('option_id')
      .eq('poll_id', poll.id)
      .eq('user_id', currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setVoted(true);
          setSelected(data.option_id);
          loadResults();
        }
      });
  }, [currentUserId, poll.id]); // eslint-disable-line

  async function loadResults() {
    const { data } = await supabase
      .from('poll_votes')
      .select('option_id');
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(v => {
        counts[v.option_id] = (counts[v.option_id] ?? 0) + 1;
      });
      setResults(counts);
    }
  }

  async function handleVote(optionId: string) {
    if (!currentUserId || voted) return;
    setVoted(true);
    setSelected(optionId);
    await supabase.from('poll_votes').insert({
      poll_id: poll.id,
      post_id: postId,
      user_id: currentUserId,
      option_id: optionId,
    });
    loadResults();
  }

  const total = Object.values(results).reduce((a, b) => a + b, 0);

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 10px', color: 'var(--text-primary)' }}>
        {poll.question}
      </p>
      {poll.options.map(opt => {
        const count = results[opt.id] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        const isSelected = selected === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => handleVote(opt.id)}
            disabled={voted && !isSelected}
            style={{
              display: 'block',
              width: '100%',
              marginBottom: 6,
              padding: '8px 12px',
              borderRadius: 10,
              border: `2px solid ${isSelected ? 'var(--nia-violet)' : 'var(--border)'}`,
              background: 'var(--surface-1)',
              cursor: voted ? 'default' : 'pointer',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              fontSize: 13,
              textAlign: 'left',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {voted && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${pct}%`,
                  background: 'rgba(139, 92, 246, 0.1)',
                  transition: 'width 0.3s ease',
                  borderRadius: 8,
                }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between' }}>
              <span>{opt.text}</span>
              {voted && <span style={{ fontWeight: 700 }}>{Math.round(pct)}%</span>}
            </span>
          </button>
        );
      })}
      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
        {total} vote{total !== 1 ? 's' : ''}
      </p>
    </div>
  );
}