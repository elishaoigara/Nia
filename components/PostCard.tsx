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
  Play,
  Bookmark,
  BookmarkCheck,
  Pencil,
  Trash2,
  Link2,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getStoryRingData } from '@/lib/activeStories';
import type { Poll, Post } from '@/types/domain';
import MediaLightbox from './MediaLightbox';
import FollowButton from './FollowButton';
import { getFlag } from '@/lib/african-data';

/* ── Types ──────────────────────────────────── */

type PostMedia = { url: string; type: 'image' | 'video' };

export interface PostCardProps {
  post: Post;
  currentUserId?: string | null;
  onDelete?: (postId: string) => void;
  showLine?: boolean;
}

const EDIT_WINDOW_MINS = 15;
const MAX_EDIT_CHARS   = 500;

/* ── HTML-escape helper (XSS-safe) ────────────── */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => map[char] || char);
}

/* ── Rich-text renderer (XSS-safe) ─────────────── */
function RichText({ text }: { text: string }) {
  const escaped = escapeHtml(text);
  const html = escaped
    .replace(/\n/g, '<br>')
    .replace(/(#[\w\u00C0-\u024F\u1E00-\u1EFF]+)/g, '<span class="tag-hl">$1</span>')
    .replace(/(@[\w]+)/g, '<span class="tag-hl">$1</span>');
  return <p className="post-text" dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ── Time helper ──────────────────────────────── */
function timeAgo(date: string): string {
  const now  = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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

/* ── Post weight variant ─────────────────────────
   Determines the visual "weight" class applied to
   the post-row, driving CSS differentiation:
     post-row--text      Default. Flush, minimal padding.
     post-row--media     Has images/video. Extra breathing
     post-row--trending  Hot post (>=30 likes). Accent
   ─────────────────────────────────────────────── */
const TRENDING_THRESHOLD = 30; // likes to qualify as trending

const CONTRIBUTION_MODE_LABELS: Record<NonNullable<Post['contribution_mode']>, string> = {
  ask: 'Ask',
  offer: 'Offer help',
  update: 'Progress update',
  opportunity: 'Opportunity',
  reflection: 'Reflection',
};

type PostVariant = 'media' | 'trending' | 'text';

function getPostVariant(
  hasMedia: boolean,
  likesCount: number,
): PostVariant {
  if (hasMedia) return 'media';
  if (likesCount >= TRENDING_THRESHOLD) return 'trending';
  return 'text';
}

/* ── Component ───────────────────────────────── */
export default function PostCard({ post, currentUserId, onDelete, showLine }: PostCardProps) {
  const supabase = createClient();
  const router   = useRouter();

  const [liked,              setLiked]              = useState(
    !!currentUserId && Array.isArray(post.likes) && post.likes.some(l => l.user_id === currentUserId)
  );
  const [likesCount,         setLikesCount]         = useState(
    post.likes_count ?? post.likes?.length ?? 0
  );
  const [commentsCount] = useState(
    post.comments_count ?? post.comments?.length ?? 0
  );
  const [repostsCount,       setRepostsCount]       = useState(
    post.reposts_count ?? post.reposts?.length ?? 0
  );
  const [reposted,           setReposted]           = useState(
    !!currentUserId && Array.isArray(post.reposts) && post.reposts.some(r => r.user_id === currentUserId)
  );
  const [bookmarked,         setBookmarked]         = useState(
    !!currentUserId && Array.isArray(post.bookmarks) && post.bookmarks.some(b => b.user_id === currentUserId)
  );
  const [showMenu,           setShowMenu]           = useState(false);
  const [lightboxOpen,       setLightboxOpen]       = useState(false);
  const [lightboxIndex,      setLightboxIndex]      = useState(0);
  const [isFollowingAuthor,  setIsFollowingAuthor]  = useState(!!post.viewer_is_following);
  const [copied,             setCopied]             = useState(false);

  // Edit state
  const [editing,     setEditing]     = useState(false);
  const [editContent, setEditContent] = useState(post.content ?? '');
  const [editLoading, setEditLoading] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  // Repost confirm
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const repostMenuRef = useRef<HTMLDivElement>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const profile = post.profiles;
  const circle  = post.circles;

  // Story ring — only shown if this author has a currently-active story,
  // styled differently depending on whether the viewer has already seen it.
  // Uses the shared cache so a whole feed of PostCards costs one lookup,
  // not one query per card.
  const [hasActiveStory, setHasActiveStory] = useState(false);
  const [storyUnseen,    setStoryUnseen]    = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    getStoryRingData(currentUserId ?? null).then(({ active, unseen }) => {
      if (cancelled) return;
      setHasActiveStory(active.has(profile.id));
      setStoryUnseen(unseen.has(profile.id));
    });
    return () => { cancelled = true };
  }, [profile?.id, currentUserId]);

  const allMedia: PostMedia[] = [];
  if (post.media_url && post.media_type) {
    const type = post.media_type === 'video' ? 'video' : 'image';
    allMedia.push({ url: post.media_url, type });
  }
  if (post.extra_media && Array.isArray(post.extra_media)) {
    allMedia.push(...post.extra_media.map(media => ({
      url: media.url,
      type: media.type === 'video' ? 'video' as const : 'image' as const,
    })));
  }

  // Is this post within the 15-min edit window?
  const isOwner = currentUserId === post.user_id;
  const [renderedAt] = useState(() => Date.now());
  const minsOld = (renderedAt - new Date(post.created_at).getTime()) / 60000;
  const canEdit = isOwner && minsOld <= EDIT_WINDOW_MINS;
  const editCharsLeft = MAX_EDIT_CHARS - editContent.length;

  /* Note: liked / reposted / bookmarked / following state are derived
     synchronously from the post payload (see useState initializers above),
     so no client-side fetch or flash-of-wrong-state on mount. */

  /* Close menus on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
      if (repostMenuRef.current && !repostMenuRef.current.contains(e.target as Node)) setShowRepostMenu(false);
    }
    if (showMenu || showRepostMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu, showRepostMenu]);

  /* Auto-grow edit textarea */
  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.style.height = 'auto';
      editRef.current.style.height = editRef.current.scrollHeight + 'px';
      editRef.current.focus();
    }
  }, [editing]);

  /* ── Actions ── */
  const handleLike = useCallback(async () => {
    if (!currentUserId) return;
    // Use functional updaters to avoid stale closure on rapid taps
    let isNowLiked = false;
    setLiked(prev => { isNowLiked = !prev; return !prev; });
    setLikesCount((prev: number) => isNowLiked ? prev + 1 : prev - 1);
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUserId);
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId });
      // Notify post owner — skip self-like
      if (post.user_id && post.user_id !== currentUserId) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: currentUserId,
          type: 'like',
          entity_id: post.id,
          message: `${profile?.username ?? 'Someone'} liked your post`,
          is_read: false,
        });
      }
    }
  }, [currentUserId, liked, post.id, post.user_id, profile?.username, supabase]);

  const handleRepost = useCallback(async () => {
    if (!currentUserId) return;
    setShowRepostMenu(false);
    setReposted(prev => !prev);
    setRepostsCount((prev: number) => reposted ? prev - 1 : prev + 1);
    if (reposted) {
      await supabase.from('reposts').delete().eq('post_id', post.id).eq('user_id', currentUserId);
    } else {
      await supabase.from('reposts').insert({ post_id: post.id, user_id: currentUserId });
      // Notify post owner — skip self-repost
      if (post.user_id && post.user_id !== currentUserId) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: currentUserId,
          type: 'repost',
          entity_id: post.id,
          message: `${profile?.username ?? 'Someone'} reposted your post`,
          is_read: false,
        });
      }
    }
  }, [currentUserId, reposted, post.id, post.user_id, profile?.username, supabase]);

  const handleBookmark = useCallback(async () => {
    if (!currentUserId) return;
    setBookmarked(prev => !prev);
    if (bookmarked) {
      await supabase.from('bookmarks').delete().eq('post_id', post.id).eq('user_id', currentUserId);
    } else {
      await supabase.from('bookmarks').insert({ post_id: post.id, user_id: currentUserId });
    }
  }, [currentUserId, bookmarked, post.id, supabase]);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (!window.confirm('Delete this post?')) return;
    await supabase.from('posts').delete().eq('id', post.id);
    onDelete?.(post.id);
    router.refresh();
  }, [post.id, onDelete, router, supabase]);

  const handleEditSave = useCallback(async () => {
    if (!canEdit || editLoading) return;
    if (editCharsLeft < 0) return;
    setEditLoading(true);
    const { error } = await supabase.from('posts')
      .update({ content: editContent.trim() || null })
      .eq('id', post.id);
    setEditLoading(false);
    if (!error) { setEditing(false); router.refresh(); }
  }, [canEdit, editContent, editCharsLeft, editLoading, post.id, router, supabase]);

  const handleCopyLink = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [post.id]);

  const initials = profile?.username?.[0]?.toUpperCase() ?? '?';

  /* ── Variant ── */
  const variant = getPostVariant(allMedia.length > 0, likesCount);

  const handlePostClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.post-action-btn') ||
      target.closest('.btn-follow') ||
      target.closest('.post-edit-area') ||
      target.closest('a')
    ) return;
    router.push(`/posts/${post.id}`);
  };

  return (
    <>
      <article
        className={`post-row post-row--${variant}`}
        onClick={handlePostClick}
        style={{ cursor: 'pointer' }}
      >
        {/* ── Left column ── */}
        <div className="post-left">
          <Link
            href={`/profile/${profile?.id ?? '#'}`}
            onClick={e => e.stopPropagation()}
            className={`post-avatar${hasActiveStory ? (storyUnseen ? ' post-ring-unseen' : ' post-ring-seen') : ''}`}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.username ?? ''} />
              : <div className="post-avatar-inner">{initials}</div>
            }
          </Link>
          {showLine && <div className="post-line" />}
        </div>

        {/* ── Body ── */}
        <div className="post-body">
          {/* Header */}
          <div className="post-header">
            {/* Left: name + handle on one line, time + badges on second line */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Row 1: display name + @handle */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                <Link href={`/profile/${profile?.id ?? '#'}`} className="post-username" onClick={e => e.stopPropagation()}>
                  {profile?.full_name ?? profile?.username ?? 'unknown'}
                </Link>
                {profile?.username && (
                  <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 400 }}>
                    @{profile.username}
                  </span>
                )}
                {profile?.country && (
                  <span style={{ fontSize: 12, flexShrink: 0 }} title={profile.country}>
                    {getFlag(profile.country)}
                  </span>
                )}
              </div>
              {/* Row 2: time + optional badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span className="post-time">{timeAgo(post.created_at)}</span>
                {variant === 'trending' && (
                  <span className="post-badge post-badge--trending">🔥 trending</span>
                )}
                {post.contribution_mode && (
                  <span className={`post-purpose-tag post-purpose-tag--${post.contribution_mode}`}>
                    {CONTRIBUTION_MODE_LABELS[post.contribution_mode]}
                  </span>
                )}
                {canEdit && (
                  <span style={{ fontSize: 11, color: 'var(--nia-violet)', fontWeight: 600, background: 'rgba(91,33,182,0.08)', borderRadius: 4, padding: '1px 5px' }}>
                    editable
                  </span>
                )}
                {circle && <span className="post-circle-tag">{circle.name}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {currentUserId && currentUserId !== profile?.id && profile && !isFollowingAuthor && (
                <FollowButton
                  targetUserId={profile.id}
                  currentUserId={currentUserId}
                  initialIsFollowing={false}
                  onFollowChange={setIsFollowingAuthor}
                />
              )}

              {/* ⋯ menu */}
              <div style={{ position: 'relative' }} ref={menuRef}>
                <button
                  className="post-action-btn"
                  onClick={e => { e.stopPropagation(); setShowMenu(prev => !prev); }}
                  style={{ marginRight: -8 }}
                >
                  <MoreHorizontal size={18} />
                </button>
                {showMenu && (
                  <div style={{
                    position: 'absolute', right: 0, top: '100%',
                    background: 'var(--surface-1)', border: '1px solid var(--border)',
                    borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    zIndex: 30, minWidth: 170, overflow: 'hidden',
                  }}>
                    {/* Copy link */}
                    <button onClick={handleCopyLink} style={menuItemStyle()}>
                      {copied ? <Check size={14} /> : <Link2 size={14} />}
                      {copied ? 'Copied!' : 'Copy link'}
                    </button>

                    {/* Bookmark */}
                    <button
                      onClick={e => { e.stopPropagation(); setShowMenu(false); handleBookmark(); }}
                      style={menuItemStyle()}
                    >
                      {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      {bookmarked ? 'Bookmarked' : 'Bookmark'}
                    </button>

                    {/* Edit — only within 15min window */}
                    {canEdit && (
                      <button
                        onClick={e => { e.stopPropagation(); setShowMenu(false); setEditing(true); }}
                        style={menuItemStyle()}
                      >
                        <Pencil size={14} />
                        Edit post
                      </button>
                    )}

                    {/* Delete — only owner */}
                    {isOwner && (
                      <button onClick={handleDelete} style={menuItemStyle('#f43f5e')}>
                        <Trash2 size={14} />
                        Delete post
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content / Edit mode */}
          {editing ? (
            <div className="post-edit-area" onClick={e => e.stopPropagation()}>
              <textarea
                ref={editRef}
                value={editContent}
                onChange={e => {
                  setEditContent(e.target.value);
                  if (editRef.current) {
                    editRef.current.style.height = 'auto';
                    editRef.current.style.height = editRef.current.scrollHeight + 'px';
                  }
                }}
                style={{
                  width: '100%', border: '1.5px solid var(--nia-violet)',
                  borderRadius: 10, padding: '8px 12px', fontSize: 15,
                  fontFamily: 'inherit', lineHeight: 1.55, resize: 'none',
                  background: 'var(--surface-1)', color: 'var(--text-primary)',
                  outline: 'none', overflow: 'hidden',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: editCharsLeft < 0 ? '#f43f5e' : editCharsLeft < 50 ? '#f59e0b' : 'var(--text-tertiary)',
                }}>
                  {editCharsLeft} chars left
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setEditing(false); setEditContent(post.content ?? ''); }}
                    style={{
                      padding: '5px 14px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'none', cursor: 'pointer', fontSize: 13,
                      color: 'var(--text-secondary)', fontFamily: 'inherit',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleEditSave(); }}
                    disabled={editLoading || editCharsLeft < 0}
                    style={{
                      padding: '5px 14px', borderRadius: 8, border: 'none',
                      background: 'var(--grad-brand)', color: '#fff', cursor: 'pointer',
                      fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                      opacity: editCharsLeft < 0 ? 0.5 : 1,
                    }}
                  >
                    {editLoading ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            post.content && <RichText text={post.content} />
          )}

          {/* Media grid */}
          {allMedia.length > 0 && (
            <div className={`post-media ${mediaGridClass(allMedia.length)}`} onClick={e => e.stopPropagation()}>
              {allMedia.map((m, i) => (
                <div key={i} onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                  style={{ position: 'relative', cursor: 'pointer' }}>
                  {m.type === 'video' ? (
                    <>
                      <video src={m.url} />
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)',
                      }}>
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

          {/* Poll */}
          {post.polls && post.polls.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {post.polls.map(poll => (
                <PollCard key={poll.id} poll={poll} postId={post.id} currentUserId={currentUserId} />
              ))}
            </div>
          )}

          {/* Language label */}
          {post.language && post.language !== 'english' && (
            <div style={{
              fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4,
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px',
            }}>
              {post.language}
            </div>
          )}

          {/* Action bar */}
          <div className="post-actions">
            {/* Like */}
            <button className={`post-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike} title="Like">
              <Heart size={variant === 'text' ? 17 : 18} />
              {likesCount > 0 && <span className="post-action-label">{likesCount}</span>}
            </button>

            {/* Comment */}
            <Link href={`/posts/${post.id}`} className="post-action-btn" onClick={e => e.stopPropagation()} title="Reply">
              <MessageCircle size={variant === 'text' ? 17 : 18} />
              {commentsCount > 0 && <span className="post-action-label">{commentsCount}</span>}
            </Link>

            {/* Repost */}
            <div style={{ position: 'relative' }} ref={repostMenuRef}>
              <button
                className={`post-action-btn ${reposted ? 'reposted' : ''}`}
                onClick={e => { e.stopPropagation(); setShowRepostMenu(prev => !prev); }}
                title="Repost"
              >
                <Repeat2 size={variant === 'text' ? 17 : 18} />
                {repostsCount > 0 && <span className="post-action-label">{repostsCount}</span>}
              </button>
              {showRepostMenu && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 0,
                  background: 'var(--surface-1)', border: '1px solid var(--border)',
                  borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  zIndex: 30, minWidth: 150, overflow: 'hidden',
                }}>
                  <button
                    onClick={e => { e.stopPropagation(); handleRepost(); }}
                    style={menuItemStyle(reposted ? '#f43f5e' : 'var(--nia-mint)')}
                  >
                    <Repeat2 size={14} />
                    {reposted ? 'Undo repost' : 'Repost'}
                  </button>
                </div>
              )}
            </div>

            {/* Spacer pushes bookmark+share to right */}
            <div style={{ flex: 1 }} />

            {/* Bookmark */}
            <button
              className={`post-action-btn ${bookmarked ? 'bookmarked' : ''}`}
              onClick={e => { e.stopPropagation(); handleBookmark(); }}
              title={bookmarked ? 'Bookmarked' : 'Bookmark'}
            >
              {bookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
            </button>

            {/* Share / copy link */}
            <button
              className="post-action-btn"
              onClick={e => {
                e.stopPropagation();
                navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              title="Copy link"
            >
              {copied ? <Check size={17} /> : <Share size={17} />}
            </button>
          </div>
        </div>
      </article>

      {/* Lightbox */}
      {lightboxOpen && (
        <MediaLightbox items={allMedia} startIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

/* ── Menu item style helper ─── */
function menuItemStyle(color = 'var(--text-primary)'): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '10px 16px',
    border: 'none', background: 'none', cursor: 'pointer',
    fontSize: 14, color, fontFamily: 'inherit', textAlign: 'left',
  };
}

/* ── Poll Card sub-component ─────────────────── */
function PollCard({
  poll, postId, currentUserId,
}: {
  poll: Poll; postId: string; currentUserId?: string | null;
}) {
  const supabase = createClient();
  const [voted,    setVoted]    = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [results,  setResults]  = useState<Record<string, number>>({});

  const loadResults = useCallback(async () => {
    const { data } = await supabase.from('poll_votes').select('option_id').eq('poll_id', poll.id);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(vote => { counts[vote.option_id] = (counts[vote.option_id] ?? 0) + 1; });
      setResults(counts);
    }
  }, [poll.id, supabase]);

  useEffect(() => {
    if (!currentUserId) return;
    supabase.from('poll_votes').select('option_id').eq('poll_id', poll.id).eq('user_id', currentUserId)
      .maybeSingle().then(({ data }) => {
        if (data) { setVoted(true); setSelected(data.option_id); void loadResults(); }
      });
  }, [currentUserId, loadResults, poll.id, supabase]);

  async function handleVote(optionId: string) {
    if (!currentUserId || voted) return;
    setVoted(true); setSelected(optionId);
    await supabase.from('poll_votes').insert({ poll_id: poll.id, post_id: postId, user_id: currentUserId, option_id: optionId });
    loadResults();
  }

  const total = Object.values(results).reduce((a, b) => a + b, 0);

  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 12, marginBottom: 8 }}>
      <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 10px', color: 'var(--text-primary)' }}>
        {poll.question}
      </p>
      {poll.options.map(opt => {
        const count = results[opt.id] ?? 0;
        const pct   = total > 0 ? (count / total) * 100 : 0;
        const isSel = selected === opt.id;
        return (
          <button key={opt.id} onClick={() => handleVote(opt.id)} disabled={voted && !isSel}
            style={{
              display: 'block', width: '100%', marginBottom: 6, padding: '8px 12px',
              borderRadius: 10, border: `2px solid ${isSel ? 'var(--nia-violet)' : 'var(--border)'}`,
              background: 'var(--surface-1)', cursor: voted ? 'default' : 'pointer',
              color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13,
              textAlign: 'left', position: 'relative', overflow: 'hidden',
            }}>
            {voted && (
              <div style={{
                position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`,
                background: 'rgba(139, 92, 246, 0.1)', transition: 'width 0.3s ease', borderRadius: 8,
              }} />
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