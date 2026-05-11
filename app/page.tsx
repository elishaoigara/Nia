import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreatePost from '@/components/CreatePost'
import PostCard from '@/components/PostCard'
import LoadMore from '@/components/LoadMore'
import FeedTabs from '@/components/FeedTabs'
import StoriesBar from '@/components/StoriesBar'
import { Globe2 } from 'lucide-react'
import { Suspense } from 'react'

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>
}) {
  const { page, tab } = await searchParams
  const currentPage = parseInt(page ?? '1')
  const currentTab = tab ?? 'africa'
  const pageSize = 15
  const offset = (currentPage - 1) * pageSize

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get current user's country for "local" tab
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('country')
    .eq('id', user.id)
    .single()

  const baseSelect = `
    *, 
    profiles:user_id (id, username, avatar_url, country, city),
    circles:circle_id (id, name, slug),
    likes (user_id),
    comments (id),
    reactions (user_id, emoji),
    reposts (user_id),
    poll:polls (*)
  `

  let posts: any[] = []

  if (currentTab === 'following') {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
    const followingIds = follows?.map(f => f.following_id) ?? []

    if (followingIds.length > 0) {
      const { data } = await supabase
        .from('posts')
        .select(baseSelect)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)
      posts = data ?? []
    }
  } else if (currentTab === 'local' && myProfile?.country) {
    // Posts from people in the same country
    const { data: countryUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('country', myProfile.country)
    const countryIds = countryUsers?.map(p => p.id) ?? []

    if (countryIds.length > 0) {
      const { data } = await supabase
        .from('posts')
        .select(baseSelect)
        .in('user_id', countryIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)
      posts = data ?? []
    }
  } else {
    // Africa tab — all posts
    const { data } = await supabase
      .from('posts')
      .select(baseSelect)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
    posts = data ?? []
  }

  const hasMore = posts.length === pageSize

  const emptyMessages: Record<string, { emoji: string; title: string; body: string }> = {
    africa: { emoji: '🌍', title: 'Be the first to post!', body: 'Start the conversation for all of Africa.' },
    local: { emoji: '📍', title: `Nothing local yet`, body: myProfile?.country ? `No posts from ${myProfile.country} yet. Be first!` : 'Set your country in your profile to see local posts.' },
    following: { emoji: '👀', title: 'No posts yet', body: 'Follow people to see their posts here.' },
  }

  const empty = emptyMessages[currentTab] ?? emptyMessages.africa

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--grad-brand)' }}>
          <Globe2 size={16} className="text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-xl leading-tight">Nia Feed</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {currentTab === 'africa' && 'Voices from across Africa 🌍'}
            {currentTab === 'local' && `From ${myProfile?.country ?? 'your country'} 📍`}
            {currentTab === 'following' && 'People you follow 👥'}
          </p>
        </div>
      </div>

      {/* Stories */}
      <StoriesBar currentUserId={user.id} />

      {/* Feed tabs */}
      <Suspense fallback={null}>
        <FeedTabs currentTab={currentTab} />
      </Suspense>

      {/* Compose */}
      <div id="compose">
        <CreatePost userId={user.id} />
      </div>

      {/* Empty state */}
      {posts.length === 0 && (
        <div className="card text-center py-20 space-y-3">
          <div className="text-5xl">{empty.emoji}</div>
          <p className="font-bold text-lg">{empty.title}</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{empty.body}</p>
        </div>
      )}

      {/* Posts */}
      {posts.map((post, i) => (
        <div key={post.id} style={{ animationDelay: `${i * 0.04}s` }}>
          <PostCard post={post} currentUserId={user.id} />
        </div>
      ))}

      {hasMore && <LoadMore currentPage={currentPage} currentTab={currentTab} />}
    </main>
  )
}
