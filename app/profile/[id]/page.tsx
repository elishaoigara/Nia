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
  BadgeCheck, Loader2,
} from 'lucide-react'

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

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [profile,       setProfile]       = useState<any>(null)
  const [posts,         setPosts]         = useState<any[]>([])
  const [replies,       setReplies]       = useState<any[]>([])
  const [saved,         setSaved]         = useState<any[]>([])
  const [tab,           setTab]           = useState<Tab>('posts')
  const [loading,       setLoading]       = useState(true)
  const [tabLoading,    setTabLoading]    = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount,setFollowingCount]= useState(0)
  const [isFollowing,   setIsFollowing]   = useState(false)

  const isOwner = currentUserId === id

  /* ── Auth ── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, []) // eslint-disable-line

  /* ── Profile + counts ── */
  useEffect(() => {
    if (!id) return
    setLoading(true)

    Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', id),
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', id),
    ]).then(([profileRes, followersRes, followingRes]) => {
      setProfile(profileRes.data)
      setFollowerCount(followersRes.count ?? 0)
      setFollowingCount(followingRes.count ?? 0)
      setLoading(false)
    })
  }, [id]) // eslint-disable-line

  /* ── Is current user following? ── */
  useEffect(() => {
    if (!currentUserId || !id || currentUserId === id) return
    supabase.from('follows').select('follower_id').eq('follower_id', currentUserId).eq('following_id', id)
      .maybeSingle().then(({ data }) => setIsFollowing(!!data))
  }, [currentUserId, id]) // eslint-disable-line

  /* ── Posts ── */
  useEffect(() => {
    if (!id) return
    supabase.from('posts').select(BASE_SELECT).eq('user_id', id)
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setPosts(data ?? []))
  }, [id]) // eslint-disable-line

  /* ── Replies (on tab switch) ── */
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

  /* ── Saved (only for owner) ── */
  const loadSaved = useCallback(async () => {
    if (saved.length > 0) return
    setTabLoading(true)
    const { data } = await supabase.from('bookmarks').select(`
      post_id,
      posts:post_id (
        *,
        profiles:user_id (id, username, full_name, avatar_url, country, city),
        circles:circle_id (id, name, slug),
        likes (user_id),
        comments (id),
        reposts (user_id),
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
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--nia-violet)' }} />
    </div>
  )

  if (!profile) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>
      User not found.
    </div>
  )

  const initials = profile.username?.[0]?.toUpperCase() ?? '?'

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', minHeight: '100vh' }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        position: 'sticky', top: 'var(--nav-top)', background: 'var(--surface-0)',
        zIndex: 10, borderBottom: '1px solid var(--divider)',
      }}>
        <button onClick={() => router.back()} style={{
          width: 34, height: 34, borderRadius: '50%', border: 'none',
          background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>
            {profile.full_name ?? profile.username}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {posts.length} posts
          </div>
        </div>
      </div>

      {/* ── Banner / Avatar ── */}
      <div style={{ position: 'relative', marginBottom: 60 }}>
        {/* Banner */}
        <div style={{
          height: 140,
          background: profile.banner_url
            ? `url(${profile.banner_url}) center/cover no-repeat`
            : 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F59E0B 100%)',
        }} />

        {/* Avatar */}
        <div style={{
          position: 'absolute', bottom: -48, left: 16,
          width: 88, height: 88, borderRadius: '50%',
          border: '4px solid var(--surface-0)',
          background: 'var(--grad-brand)',
          overflow: 'hidden', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 28,
        }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials
          }
        </div>

        {/* Action buttons top-right */}
        <div style={{
          position: 'absolute', bottom: -40, right: 16,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          {isOwner ? (
            <Link href="/profile/edit" style={{
              padding: '7px 16px', borderRadius: 20,
              border: '1.5px solid var(--border)',
              background: 'var(--surface-1)', color: 'var(--text-primary)',
              fontWeight: 700, fontSize: 13, textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Pencil size={13} />
              Edit profile
            </Link>
          ) : currentUserId ? (
            <FollowButton
              targetUserId={id}
              currentUserId={currentUserId}
              initialIsFollowing={isFollowing}
            />
          ) : null}
        </div>
      </div>

      {/* ── Profile info ── */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 18 }}>
            {profile.full_name ?? profile.username}
          </span>
          {profile.is_verified && (
            <BadgeCheck size={18} style={{ color: 'var(--nia-violet)', flexShrink: 0 }} />
          )}
        </div>
        <div style={{ color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 8 }}>
          @{profile.username}
        </div>

        {profile.bio && (
          <p style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 10, color: 'var(--text-primary)' }}>
            {profile.bio}
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginBottom: 12 }}>
          {(profile.city || profile.country) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-tertiary)' }}>
              <MapPin size={13} />
              {[profile.city, profile.country].filter(Boolean).join(', ')}
            </span>
          )}
          {profile.created_at && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-tertiary)' }}>
              <Calendar size={13} />
              Joined {timeJoined(profile.created_at)}
            </span>
          )}
        </div>

        {/* Follower counts */}
        <div style={{ display: 'flex', gap: 20 }}>
          <span style={{ fontSize: 14 }}>
            <strong style={{ fontWeight: 800 }}>{followingCount}</strong>
            <span style={{ color: 'var(--text-tertiary)', marginLeft: 4 }}>Following</span>
          </span>
          <span style={{ fontSize: 14 }}>
            <strong style={{ fontWeight: 800 }}>{followerCount}</strong>
            <span style={{ color: 'var(--text-tertiary)', marginLeft: 4 }}>
              {followerCount === 1 ? 'Follower' : 'Followers'}
            </span>
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--divider)',
        position: 'sticky', top: 'calc(var(--nav-top) + 55px)',
        background: 'var(--surface-0)', zIndex: 9,
      }}>
        {([
          { key: 'posts',   icon: <Grid3x3 size={15} />,      label: 'Posts' },
          { key: 'replies', icon: <MessageCircle size={15} />, label: 'Replies' },
          ...(isOwner ? [{ key: 'saved', icon: <Bookmark size={15} />, label: 'Saved' }] : []),
        ] as { key: Tab; icon: React.ReactNode; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            style={{
              flex: 1, padding: '14px 8px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t.key ? 800 : 500,
              fontSize: 14,
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              borderBottom: tab === t.key ? '2px solid var(--nia-violet)' : '2px solid transparent',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tabLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--nia-violet)' }} />
        </div>
      ) : (
        <>
          {/* Posts */}
          {tab === 'posts' && (
            posts.length === 0
              ? <EmptyState message="No posts yet" />
              : posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUserId}
                    onDelete={handlePostDelete}
                  />
                ))
          )}

          {/* Replies */}
          {tab === 'replies' && (
            replies.length === 0
              ? <EmptyState message="No replies yet" />
              : replies.map((reply: any) => (
                  <div key={reply.id} style={{
                    borderBottom: '1px solid var(--divider)',
                    padding: '12px 16px',
                  }}>
                    {/* The post being replied to */}
                    {reply.posts && (
                      <Link href={`/posts/${reply.post_id}`} style={{ textDecoration: 'none' }}>
                        <div style={{
                          fontSize: 13, color: 'var(--text-tertiary)',
                          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <MessageCircle size={12} />
                          Replying to @{reply.posts?.profiles?.username ?? 'unknown'}
                        </div>
                        {reply.posts?.content && (
                          <div style={{
                            fontSize: 13, color: 'var(--text-tertiary)',
                            borderLeft: '2px solid var(--border)',
                            paddingLeft: 10, marginBottom: 8,
                            overflow: 'hidden', display: '-webkit-box',
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          }}>
                            {reply.posts.content}
                          </div>
                        )}
                      </Link>
                    )}
                    {/* The reply itself */}
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                      {reply.content}
                    </p>
                    {/* Reply media */}
                    {reply.media_url && (
                      <div style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden', maxWidth: 280, border: '1px solid var(--border)' }}>
                        {reply.media_type === 'video'
                          ? <video src={reply.media_url} controls style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
                          : <img src={reply.media_url} alt="" style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
                        }
                      </div>
                    )}
                    {Array.isArray(reply.extra_media) && reply.extra_media.length > 0 && (
                      <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, maxWidth: 280, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        {reply.extra_media.slice(0, 3).map((m: any, i: number) => (
                          m.type === 'video'
                            ? <video key={i} src={m.url} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                            : <img key={i} src={m.url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                        ))}
                      </div>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                      {new Date(reply.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))
          )}

          {/* Saved — owner only */}
          {tab === 'saved' && isOwner && (
            saved.length === 0
              ? <EmptyState message="No saved posts yet" sub="Tap the bookmark icon on any post to save it here." />
              : saved.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUserId}
                    onDelete={handlePostDelete}
                  />
                ))
          )}
        </>
      )}
    </div>
  )
}

function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '60px 24px', gap: 8, color: 'var(--text-tertiary)',
    }}>
      <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>{message}</p>
      {sub && <p style={{ fontSize: 14, margin: 0, textAlign: 'center' }}>{sub}</p>}
    </div>
  )
}