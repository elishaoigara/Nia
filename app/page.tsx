import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreatePost from '@/components/CreatePost'
import PostCard from '@/components/PostCard'

export default async function FeedPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:user_id (id, username, avatar_url, university),
      circles:circle_id (id, name, slug),
      likes (user_id),
      comments (id)
    `)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <CreatePost userId={user.id} />

      {posts && posts.length === 0 && (
        <div className="text-center py-20 text-zinc-400">
          <p className="text-lg font-medium">No posts yet</p>
          <p className="text-sm mt-1">Be the first to post something</p>
        </div>
      )}

      {posts?.map(post => (
        <PostCard key={post.id} post={post} currentUserId={user.id} />
      ))}
    </main>
  )
}