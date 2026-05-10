import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreatePost from '@/components/CreatePost'
import PostCard from '@/components/PostCard'
import LoadMore from '@/components/LoadMore'
import FeedTabs from '@/components/FeedTabs'
import StoriesBar from '@/components/StoriesBar'
import { Sparkles } from 'lucide-react'
import { Suspense } from 'react'

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>
}) {
  const { page, tab } = await searchParams
  const currentPage = parseInt(page ?? '1')
  const currentTab = tab ?? 'foryou'
  const pageSize = 15
  const offset = (currentPage - 1) * pageSize

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let posts

  if (currentTab === 'following') {
    const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
    const followingIds = follows?.map(f => f.following_id) ?? []
    if (followingIds.length === 0) {
      posts = []
    } else {
      const { data } = await supabase
        .from('posts')
        .select(`*, profiles:user_id (id, username, avatar_url, university), circles:circle_id (id, name, slug), likes (user_id), comments (id), reactions (user_id, emoji), reposts (user_id), poll:polls (*)`)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)
      posts = data
    }
  } else {
    const { data } = await supabase
      .from('posts')
      .select(`*, profiles:user_id (id, username, avatar_url, university), circles:circle_id (id, name, slug), likes (user_id), comments (id), reactions (user_id, emoji), reposts (user_id), poll:polls (*)`)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
    posts = data
  }

  const hasMore = (posts?.length ?? 0) === pageSize

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--grad-brand)' }}>
          <Sparkles size={16} className="text-white" />
        </div>
        <h1 className="font-extrabold text-xl">Campus Feed</h1>
      </div>

      {/* Stories */}
      <StoriesBar currentUserId={user.id} />

      {/* Feed tabs */}
      <Suspense fallback={null}>
        <FeedTabs currentTab={currentTab} />
      </Suspense>

      <div id="compose">
        <CreatePost userId={user.id} />
      </div>

      {posts && posts.length === 0 && currentTab === 'following' && (
        <div className="card text-center py-20 space-y-3">
          <div className="text-5xl">👀</div>
          <p className="font-bold text-lg">Nobody followed yet</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Follow people to see their posts here</p>
        </div>
      )}

      {posts && posts.length === 0 && currentTab === 'foryou' && (
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

      {hasMore && <LoadMore currentPage={currentPage} currentTab={currentTab} />}
    </main>
  )
}
