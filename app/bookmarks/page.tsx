import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PostCard from '@/components/PostCard'
import { Bookmark } from 'lucide-react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Post } from '@/types/domain'

export default async function BookmarksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select(`
      post_id,
      posts:post_id (
        *,
        profiles:user_id (id, username, full_name, avatar_url, country),
        circles:circle_id (id, name, slug),
        likes (user_id),
        comments (id),
        reposts (user_id),
        polls (id, question, options, ends_at)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const bookmarkRows = (bookmarks ?? []) as unknown as { posts: Post | null }[]
  const posts = bookmarkRows
    .map(bookmark => bookmark.posts)
    .filter((post): post is Post => post !== null)

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--divider)',
        position: 'sticky', top: 'var(--nav-top)',
        background: 'var(--surface-0)', zIndex: 10,
      }}>
        <Link href="/" style={{
          width: 34, height: 34, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface-2)', color: 'var(--text-primary)',
          textDecoration: 'none',
        }}>
          <ArrowLeft size={18} strokeWidth={2.5} />
        </Link>
        <Bookmark size={18} />
        <span style={{ fontWeight: 800, fontSize: 16 }}>Bookmarks</span>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
          {posts.length} saved
        </span>
      </div>

      {posts.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '80px 24px', gap: 12,
          color: 'var(--text-tertiary)',
        }}>
          <Bookmark size={40} strokeWidth={1.5} />
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>No bookmarks yet</p>
          <p style={{ fontSize: 14, margin: 0, textAlign: 'center' }}>
            Tap the bookmark icon on any post to save it here.
          </p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard key={post.id} post={post} currentUserId={user.id} />
        ))
      )}
    </div>
  )
}