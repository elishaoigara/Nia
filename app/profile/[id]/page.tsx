'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PostCard from '@/components/PostCard'
import FollowButton from '@/components/FollowButton'
import {
  ArrowLeft, MapPin, Calendar, Pencil,
  Grid3x3, MessageCircle, Bookmark,
  BadgeCheck, Loader2, Link as LinkIcon,
} from 'lucide-react'
import { getFlag } from '@/lib/african-data'

const BASE_SELECT = `
  *,
  profiles:user_id (id, username, full_name, avatar_url, country, city),
  circles:circle_id (id, name, slug),
  likes (user_id),
  comments (id),
  reposts (user_id),
  polls (id, question, options, ends_at)
`

type Tab = 'posts' | 'replies' | 'saved'

function timeJoined(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export default function ProfilePage() {
  const { id }   = useParams() as { id: string }
  const router   = useRouter()
  const supabase = createClient()

  const [currentUserId,  setCurrentUserId]  = useState<string | null>(null)
  const [profile,        setProfile]        = useState<any>(null)
  const [posts,          setPosts]          = useState<any[]>([])
  const [replies,        setReplies]        = useState<any[]>([])
  const [saved,          setSaved]          = useState<any[]>([])
  const [tab,            setTab]            = useState<Tab>('posts')
  const [loading,        setLoading]        = useState(true)
  const [tabLoading,     setTabLoading]     = useState(false)
  const [followerCount,  setFollowerCount]  = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing,    setIsFollowing]    = useState(false)
  const [postCount,      setPostCount]      = useState(0)

  const isOwner = currentUserId === id

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', id),
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', id),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', id),
    ]).then(([profileRes, followersRes, followingRes, postsRes]) => {
      setProfile(profileRes.data)
      setFollowerCount(followersRes.count ?? 0)
      setFollowingCount(followingRes.count ?? 0)
      setPostCount(postsRes.count ?? 0)
      setLoading(false)
    })
  }, [id]) // eslint-disable-line

  useEffect(() => {
    if (!currentUserId || !id || currentUserId === id) return
    supabase.from('follows').select('follower_id')
      .eq('follower_id', currentUserId).eq('following_id', id)
      .maybeSingle().then(({ data }) => setIsFollowing(!!data))
  }, [currentUserId, id]) // eslint-disable-line

  useEffect(() => {
    if (!id) return
    supabase.from('posts').select(BASE_SELECT).eq('user_id', id)
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setPosts(data ?? []))
  }, [id]) // eslint-disable-line

  const loadReplies = useCallback(async () => {
    if (replies.length > 0) return
    setTabLoading(true)
    const { data } = await supabase.from('comments').select(`
      *, profiles:user_id (id, username, full_name, avatar_url),
      posts:post_id (*, profiles:user_id (id, username, full_name, avatar_url))
    `).eq('user_id', id).order('created_at', { ascending: false }).limit(30)
    setReplies(data ?? [])
    setTabLoading(false)
  }, [id, replies.length]) // eslint-disable-line

  const loadSaved = useCallback(async () => {
    if (saved.length > 0) return
    setTabLoading(true)
    const { data } = await supabase.from('bookmarks').select(`
      post_id,
      posts:post_id (
        *, profiles:user_id (id, username, full_name, avatar_url, country, city),
        circles:circle_id (id, name, slug),
        likes (user_id), comments (id), reposts (user_id),
        polls (id, question, options, ends_at)
      )
    `).eq('user_id', currentUserId!).order('created_at', { ascending: false }).limit(30)
    setSaved((data ?? []).map((b: any) => b.posts).filter(Boolean))
    setTabLoading(false)
  }, [currentUserId, saved.length]) // eslint-disable-line

  function handleTabChange(t: Tab) {
    setTab(t)
    if (t === 'replies') loadReplies()
    if (t === 'saved')   loadSaved()
  }

  function handlePostDelete(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    setSaved(prev => prev.filter(p => p.id !== postId))
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader2 size={26} className="animate-spin" style={{ color: 'var(--nia-violet)' }} />
    </div>
  )

  if (!profile) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>User not found.</div>
  )

  const initials    = profile.username?.[0]?.toUpperCase() ?? '?'
  const countryFlag = profile.country ? getFlag(profile.country) : null

  // Build banner: use uploaded image or generate a unique mesh gradient from username
  const hue1 = ((profile.username?.charCodeAt(0) ?? 65) * 17) % 360
  const hue2 = (hue1 + 60) % 360
  const defaultBanner = `radial-gradient(ellipse at 30% 60%, hsl(${hue1},70%,45%) 0%, transparent 65%),
    radial-gradient(ellipse at 80% 20%, hsl(${hue2},80%,55%) 0%, transparent 55%),
    radial-gradient(ellipse at 60% 90%, hsl(${(hue1 + 120) % 360},60%,40%) 0%, transparent 50%),
    linear-gradient(135deg, hsl(${hue1},65%,20%) 0%, hsl(${hue2},55%,15%) 100%)`

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', minHeight: '100vh' }}>

      {/* ── Sticky top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px',
        position: 'sticky', top: 'var(--nav-top)',
        background: 'var(--surface-0)',
        zIndex: 20, borderBottom: '1px solid var(--divider)',
      }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 34, height: 34, borderRadius: '50%', border: 'none',
            background: 'var(--surface-2)', cursor: 'pointer',
            color: 'var(--text-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={17} strokeWidth={2.5} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.full_name ?? profile.username}
            {profile.is_verified && <BadgeCheck size={14} style={{ color: 'var(--nia-violet)', marginLeft: 4, display: 'inline', verticalAlign: 'middle' }} />}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>{postCount} posts</p>
        </div>
        {isOwner && (
          <Link href="/profile/edit" style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
            border: '1.5px solid var(--border)', background: 'none',
            color: 'var(--text-primary)', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Pencil size={12} /> Edit
          </Link>
        )}
      </div>

      {/* ── Hero card ── */}
      <div style={{ position: 'relative', marginBottom: 0 }}>

        {/* Full-bleed atmospheric banner — taller, no hard border */}
        <div style={{
          height: 200,
          background: profile.banner_url
            ? `url(${profile.banner_url}) center/cover no-repeat`
            : defaultBanner,
          position: 'relative',
        }}>
          {/* Bottom fade into surface */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
            background: 'linear-gradient(to top, var(--surface-0), transparent)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Avatar — large, centered, overlapping banner */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          marginTop: -56, position: 'relative', zIndex: 2,
          paddingBottom: 20,
        }}>
          <div style={{
            width: 104, height: 104, borderRadius: '50%',
            border: '4px solid var(--surface-0)',
            background: 'var(--grad-brand)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 36,
            marginBottom: 12,
          }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>

          {/* Name + verified */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <h1 style={{ fontWeight: 800, fontSize: 22, margin: 0, textAlign: 'center' }}>
              {profile.full_name ?? profile.username}
            </h1>
            {profile.is_verified && (
              <BadgeCheck size={20} style={{ color: 'var(--nia-violet)', flexShrink: 0 }} />
            )}
          </div>

          {/* @handle + country flag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>@{profile.username}</span>
            {countryFlag && <span style={{ fontSize: 16 }}>{countryFlag}</span>}
          </div>

          {/* Follow/Message actions (non-owner) */}
          {!isOwner && currentUserId && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <FollowButton
                targetUserId={id}
                currentUserId={currentUserId}
                initialIsFollowing={isFollowing}
              />
              <Link
                href={`/messages/${id}`}
                style={{
                  padding: '7px 18px', borderRadius: 20,
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-primary)',
                  fontWeight: 700, fontSize: 13, textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <MessageCircle size={13} /> Message
              </Link>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <p style={{
              fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)',
              textAlign: 'center', maxWidth: 380, margin: '0 16px 16px',
            }}>
              {profile.bio}
            </p>
          )}

          {/* Meta pills row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 20, padding: '0 16px' }}>
            {(profile.city || profile.country) && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600,
                color: 'var(--text-tertiary)',
                background: 'var(--surface-2)',
                borderRadius: 20, padding: '4px 10px',
              }}>
                <MapPin size={11} />
                {[profile.city, profile.country].filter(Boolean).join(', ')}
              </span>
            )}
            {profile.created_at && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600,
                color: 'var(--text-tertiary)',
                background: 'var(--surface-2)',
                borderRadius: 20, padding: '4px 10px',
              }}>
                <Calendar size={11} />
                Joined {timeJoined(profile.created_at)}
              </span>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 600,
                  color: 'var(--nia-violet)',
                  background: 'rgba(91,33,182,0.08)',
                  borderRadius: 20, padding: '4px 10px',
                  textDecoration: 'none',
                }}
              >
                <LinkIcon size={11} />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          {/* Stats strip */}
          <div style={{
            display: 'flex', gap: 0,
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid var(--divider)',
            marginBottom: 8,
            margin: '0 16px',
          }}>
            {[
              { label: 'Posts', value: postCount },
              { label: 'Following', value: followingCount },
              { label: 'Followers', value: followerCount },
            ].map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  flex: 1, textAlign: 'center',
                  padding: '12px 8px',
                  borderRight: i < 2 ? '1px solid var(--divider)' : 'none',
                  background: 'var(--surface-1)',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.1 }}>
                  {stat.value >= 1000 ? `${(stat.value / 1000).toFixed(1)}k` : stat.value}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 2 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--divider)',
        position: 'sticky',
        top: 'calc(var(--nav-top) + 51px)',
        background: 'var(--surface-0)',
        zIndex: 9,
        marginTop: 8,
      }}>
        {(([
          { key: 'posts',   icon: <Grid3x3 size={14} />,       label: 'Posts' },
          { key: 'replies', icon: <MessageCircle size={14} />,  label: 'Replies' },
          ...(isOwner ? [{ key: 'saved', icon: <Bookmark size={14} />, label: 'Saved' }] : []),
        ]) as { key: Tab; icon: React.ReactNode; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            style={{
              flex: 1, padding: '13px 8px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t.key ? 700 : 500,
              fontSize: 13,
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              borderBottom: tab === t.key ? '2px solid var(--nia-violet)' : '2px solid transparent',
              transition: 'color 0.15s, border-color 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tabLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--nia-violet)' }} />
        </div>
      ) : (
        <>
          {tab === 'posts' && (
            posts.length === 0
              ? <EmptyState emoji="✍️" message="No posts yet" sub={isOwner ? "Share what's on your mind." : `@${profile.username} hasn't posted yet.`} />
              : posts.map(post => (
                  <PostCard key={post.id} post={post} currentUserId={currentUserId} onDelete={handlePostDelete} />
                ))
          )}

          {tab === 'replies' && (
            replies.length === 0
              ? <EmptyState emoji="💬" message="No replies yet" />
              : replies.map((reply: any) => (
                  <div key={reply.id} style={{ borderBottom: '1px solid var(--divider)', padding: '14px 16px' }}>
                    {reply.posts && (
                      <Link href={`/posts/${reply.post_id}`} style={{ textDecoration: 'none' }}>
                        <div style={{
                          fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <MessageCircle size={11} />
                          Replying to @{reply.posts?.profiles?.username ?? 'unknown'}
                        </div>
                        {reply.posts?.content && (
                          <div style={{
                            fontSize: 13, color: 'var(--text-tertiary)',
                            borderLeft: '2px solid var(--divider)',
                            paddingLeft: 10, marginBottom: 8,
                            overflow: 'hidden', display: '-webkit-box',
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          } as React.CSSProperties}>
                            {reply.posts.content}
                          </div>
                        )}
                      </Link>
                    )}
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.55 }}>{reply.content}</p>
                    {reply.media_url && (
                      <div style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden', maxWidth: 280, border: '1px solid var(--divider)' }}>
                        {reply.media_type === 'video'
                          ? <video src={reply.media_url} controls style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
                          : <img src={reply.media_url} alt="" style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
                        }
                      </div>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, display: 'block' }}>
                      {new Date(reply.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
          )}

          {tab === 'saved' && isOwner && (
            saved.length === 0
              ? <EmptyState emoji="🔖" message="No saved posts" sub="Tap the bookmark icon on any post to save it here." />
              : saved.map(post => (
                  <PostCard key={post.id} post={post} currentUserId={currentUserId} onDelete={handlePostDelete} />
                ))
          )}
        </>
      )}
    </div>
  )
}

function EmptyState({ emoji, message, sub }: { emoji?: string; message: string; sub?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '56px 24px', gap: 6,
    }}>
      {emoji && <span style={{ fontSize: 36, marginBottom: 4 }}>{emoji}</span>}
      <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: 0 }}>{message}</p>
      {sub && <p style={{ fontSize: 13, margin: 0, textAlign: 'center', color: 'var(--text-tertiary)' }}>{sub}</p>}
    </div>
  )
}