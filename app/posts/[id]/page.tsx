import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PostCard from '@/components/PostCard'
import CommentThread from '@/components/CommentThread'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

// Full query including comment likes (works if comment_likes table exists)
const FULL_SELECT = `
  *,
  profiles:user_id (id, username, avatar_url, country),
  circles:circle_id (id, name, slug),
  likes (user_id),
  reposts (user_id),
  reactions (user_id, emoji),
  comments (
    id, content, created_at, user_id,
    profiles:user_id (id, username, avatar_url),
    likes:comment_likes (user_id)
  )
`

// Fallback query without comment_likes (safe if that table is missing)
const SAFE_SELECT = `
  *,
  profiles:user_id (id, username, avatar_url, country),
  circles:circle_id (id, name, slug),
  likes (user_id),
  reposts (user_id),
  reactions (user_id, emoji),
  comments (
    id, content, created_at, user_id,
    profiles:user_id (id, username, avatar_url)
  )
`

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Try full query; fall back to safe query if comment_likes table is missing
  let post: any = null

  const { data: fullData, error: fullError } = await supabase
    .from('posts')
    .select(FULL_SELECT)
    .eq('id', id)
    .single()

  if (!fullError) {
    post = fullData
  } else {
    // PGRST116 = "no rows returned" → post genuinely doesn't exist
    if (fullError.code === 'PGRST116') notFound()

    // Any other error (e.g. missing relation) → retry without comment_likes
    const { data: safeData, error: safeError } = await supabase
      .from('posts')
      .select(SAFE_SELECT)
      .eq('id', id)
      .single()

    if (safeError || !safeData) notFound()
    post = safeData
  }

  if (!post) notFound()

  const comments = ((post.comments ?? []) as any[]).sort(
    (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 32 }}>
      {/* Back nav */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid var(--divider)',
        maxWidth: 620,
        margin: '0 auto',
      }}>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: '50%',
          color: 'var(--text-primary)',
          textDecoration: 'none',
          background: 'var(--surface-2)',
        }}>
          <ArrowLeft size={20} strokeWidth={2} />
        </Link>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Thread</span>
      </div>

      <div className="feed-container">
        {/* Original post — comment section auto-opens on detail view */}
        <PostCard post={post} currentUserId={user.id} showThreadLine={comments.length > 0} />

        {/* Comments thread */}
        {comments.length > 0 && (
          <CommentThread comments={comments} currentUserId={user.id} postId={post.id} />
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}