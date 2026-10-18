import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PostCard from '@/components/PostCard'
import CommentThread from '@/components/CommentThread'
import ReplyBar from '@/components/ReplyBar'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Comment, Post } from '@/types/domain'

interface Props { params: Promise<{ id: string }> }

// Full select — includes all optional relations (polls, reactions, comment likes)
const FULL_SELECT = `
  *,
  profiles:user_id (id, username, full_name, avatar_url, country),
  circles:circle_id (id, name, slug),
  likes (user_id),
  reposts (user_id),
  reactions (user_id, emoji),
  polls (id, question, options, ends_at),
  comments (
    id, post_id, parent_id, content, created_at, user_id,
    media_url, media_type, extra_media,
    profiles:user_id (id, username, avatar_url),
    likes:comment_likes (user_id)
  )
`

// Safe select — only core relations guaranteed to exist; no reactions/polls/comment_likes
const SAFE_SELECT = `
  *,
  profiles:user_id (id, username, full_name, avatar_url, country),
  circles:circle_id (id, name, slug),
  likes (user_id),
  reposts (user_id),
  comments (
    id, post_id, parent_id, content, created_at, user_id,
    media_url, media_type, extra_media,
    profiles:user_id (id, username, avatar_url)
  )
`

// Bare select — absolute minimum; used if safe select also fails
const BARE_SELECT = `
  *,
  profiles:user_id (id, username, full_name, avatar_url, country),
  circles:circle_id (id, name, slug),
  likes (user_id),
  reposts (user_id)
`

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let post: Post | null = null

  // Try full select first
  const { data: fullData, error: fullErr } = await supabase
    .from('posts').select(FULL_SELECT).eq('id', id).single()

  if (!fullErr && fullData) {
    post = fullData as unknown as Post
  } else {
    // Genuine "row not found" — no point trying fallbacks
    if (fullErr?.code === 'PGRST116') notFound()

    // Some join failed — try without optional relations
    const { data: safeData, error: safeErr } = await supabase
      .from('posts').select(SAFE_SELECT).eq('id', id).single()

    if (!safeErr && safeData) {
      post = safeData as unknown as Post
    } else {
      if (safeErr?.code === 'PGRST116') notFound()

      // Last resort — bare minimum
      const { data: bareData, error: bareErr } = await supabase
        .from('posts').select(BARE_SELECT).eq('id', id).single()

      if (bareErr || !bareData) notFound()
      post = bareData as unknown as Post
    }
  }

  if (!post) notFound()

  // Fetch current user's profile for the inline reply avatar (used by both
  // CommentThread's inline reply boxes and the sticky ReplyBar) — fetched
  // once here so neither client component needs its own round trip.
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', user.id)
    .single()

  // Whether the viewer already follows this post's author — computed here
  // (same as the home feed) so PostCard can hide the Follow button for
  // authors you already follow, instead of always defaulting to "show it".
  let viewerIsFollowing = false
  if (post.user_id && post.user_id !== user.id) {
    const { data: followRow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', post.user_id)
      .maybeSingle()
    viewerIsFollowing = !!followRow
  }

  const comments = ((post.comments ?? []) as unknown as Comment[]).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', minHeight: '100vh' }}>

      {/* Back nav */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--divider)',
        position: 'sticky',
        top: 'var(--nav-top)',
        background: 'var(--surface-0)',
        zIndex: 10,
      }}>
        <Link href="/" style={{
          width: 34, height: 34,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface-2)',
          color: 'var(--text-primary)',
          textDecoration: 'none',
        }}>
          <ArrowLeft size={18} strokeWidth={2.5} />
        </Link>
        <span style={{ fontWeight: 800, fontSize: 16 }}>Post</span>
      </div>

      {/* Original post */}
      <PostCard
        post={{ ...post, viewer_is_following: viewerIsFollowing }}
        currentUserId={user.id}
        showLine={comments.length > 0}
      />

      {/* Comments */}
      {comments.length > 0 && (
        <CommentThread
          comments={comments}
          currentUserId={user.id}
          postId={post.id}
          postOwnerId={post.user_id}
          currentUserProfile={currentProfile ?? undefined}
        />
      )}

      {/* Spacer so content isn't hidden behind reply bar */}
      <div style={{ height: 80 }} />

      {/* Sticky reply input */}
      <ReplyBar
        postId={post.id}
        currentUserId={user.id}
        postOwnerId={post.user_id}
        currentUserProfile={currentProfile ?? undefined}
      />
    </div>
  )
}