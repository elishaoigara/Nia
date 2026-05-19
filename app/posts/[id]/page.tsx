import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PostCard from '@/components/PostCard'
import CommentThread from '@/components/CommentThread'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: post } = await supabase
    .from('posts')
    .select(`
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
    `)
    .eq('id', id)
    .single()

  if (!post) notFound()

  // Sort comments oldest first
  const comments = (post.comments ?? []).sort(
    (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <main className="feed-container" style={{ minHeight: '100vh' }}>
      {/* Back nav */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid var(--divider)',
      }}>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: '50%',
          color: 'var(--text-primary)',
          textDecoration: 'none',
          transition: 'background 0.15s',
        }}>
          <ArrowLeft size={20} strokeWidth={2} />
        </Link>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Thread</span>
      </div>

      {/* Original post — no thread line, full display */}
      <PostCard post={post} currentUserId={user.id} showThreadLine={comments.length > 0} />

      {/* Comments thread */}
      {comments.length > 0 && (
        <CommentThread comments={comments} currentUserId={user.id} postId={post.id} />
      )}

      {/* Reply input pinned at bottom */}
      <div style={{ height: 80 }} /> {/* spacer for sticky bar */}
      <div className="reply-input-bar" style={{ position: 'fixed', bottom: 'var(--nav-bottom)', left: 0, right: 0, maxWidth: 620, margin: '0 auto' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--grad-brand)',
          flexShrink: 0,
        }} />
        <input
          className="reply-input"
          placeholder="Reply to thread…"
          readOnly
        />
      </div>
    </main>
  )
}
