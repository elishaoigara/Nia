import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreatePost from '@/components/CreatePost'
import PostCard from '@/components/PostCard'
import { Sparkles } from 'lucide-react'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: posts } = await supabase
    .from('posts')
    .select(`*, profiles:user_id (id, username, avatar_url, university), circles:circle_id (id, name, slug), likes (user_id), comments (id)`)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
      {/* Feed header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--grad-brand)' }}>
          <Sparkles size={16} className="text-white" />
        </div>
        <h1 className="font-extrabold text-xl">Campus Feed</h1>
      </div>

      <CreatePost userId={user.id} />

      {posts && posts.length === 0 && (
        <div className="card text-center py-20 space-y-3">
          <div className="text-5xl">🏕️</div>
          <p className="font-bold text-lg">Nothing here yet</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Be the first to post something!</p>
        </div>
      )}

      {posts?.map((post, i) => (
        <div key={post.id} style={{ animationDelay: `${i * 0.05}s` }}>
          <PostCard post={post} currentUserId={user.id} />
        </div>
      ))}
    </main>
  )
}
