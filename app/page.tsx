import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreatePost from '@/components/CreatePost'
import PostCard from '@/components/PostCard'
import LoadMore from '@/components/LoadMore'
import FeedTabs from '@/components/FeedTabs'
import StoriesBar from '@/components/StoriesBar'
import { Globe2 } from 'lucide-react'
import { Suspense } from 'react'
import { scorePosts } from '@/lib/feed-scorer'
import type { UserContext, ScorerPost } from '@/lib/feed-scorer'

const PAGE_SIZE = 15
const CANDIDATE_POOL = PAGE_SIZE * 6

const BASE_SELECT = `
  *,
  profiles:user_id (id, username, avatar_url, country, city),
  circles:circle_id (id, name, slug),
  likes (user_id),
  comments (id),
  reactions (user_id, emoji),
  reposts (user_id),
  poll:polls (*)
`

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>
}) {
  const { page, tab } = await searchParams
  const currentPage = parseInt(page ?? '1')
  const currentTab  = tab ?? 'africa'
  const offset      = (currentPage - 1) * PAGE_SIZE

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── 1. Query hydration (parallel) ───────────────────────────────────────
  const [profileRes, followsRes] = await Promise.all([
    supabase.from('profiles').select('country, language').eq('id', user.id).single(),
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
  ])
  const blocksRes = await supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id)
  const mutesRes  = await supabase.from('mutes').select('muted_id').eq('muter_id', user.id)

  const myProfile = profileRes.data
  const ctx: UserContext = {
    userId:       user.id,
    followingIds: new Set(((followsRes.data ?? []) as any[]).map((f: any) => f.following_id)),
    blockedIds:   new Set(((blocksRes.data  ?? []) as any[]).map((b: any) => b.blocked_id)),
    mutedIds:     new Set(((mutesRes.data   ?? []) as any[]).map((m: any) => m.muted_id)),
    country:      myProfile?.country  ?? null,
    language:     myProfile?.language ?? null,
  }

  // ── 2. Candidate fetch ───────────────────────────────────────────────────
  let candidates: ScorerPost[] = []

  if (currentTab === 'following') {
    if (ctx.followingIds.size > 0) {
      const { data } = await supabase
        .from('posts').select(BASE_SELECT)
        .in('user_id', [...ctx.followingIds])
        .order('created_at', { ascending: false })
        .limit(CANDIDATE_POOL)
      candidates = (data ?? []) as ScorerPost[]
    }
  } else if (currentTab === 'local' && myProfile?.country) {
    const { data: countryUsers } = await supabase
      .from('profiles').select('id').eq('country', myProfile.country)
    const countryIds = (countryUsers ?? []).map((p: any) => p.id)
    if (countryIds.length > 0) {
      const { data } = await supabase
        .from('posts').select(BASE_SELECT)
        .in('user_id', countryIds)
        .order('created_at', { ascending: false })
        .limit(CANDIDATE_POOL)
      candidates = (data ?? []) as ScorerPost[]
    }
  } else {
    const { data } = await supabase
      .from('posts').select(BASE_SELECT)
      .order('created_at', { ascending: false })
      .limit(CANDIDATE_POOL)
    candidates = (data ?? []) as ScorerPost[]
  }

  // ── 3. Score + rank ──────────────────────────────────────────────────────
  const ranked = scorePosts(candidates, ctx)
  const posts   = ranked.slice(offset, offset + PAGE_SIZE)
  const hasMore = ranked.length > offset + PAGE_SIZE

  // ── UI strings ───────────────────────────────────────────────────────────
  const emptyMessages: Record<string, { emoji: string; title: string; body: string }> = {
    africa:    { emoji: '🌍', title: 'Be the first to post!', body: 'Start the conversation for all of Africa.' },
    local:     { emoji: '📍', title: 'Nothing local yet',     body: myProfile?.country ? `No posts from ${myProfile.country} yet. Be first!` : 'Set your country in your profile to see local posts.' },
    following: { emoji: '👀', title: 'No posts yet',          body: 'Follow people to see their posts here.' },
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
            {currentTab === 'africa'    && 'Voices from across Africa 🌍'}
            {currentTab === 'local'     && `From ${myProfile?.country ?? 'your country'} 📍`}
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
      {(posts as ScorerPost[]).map((post: ScorerPost, i: number) => (
        <div key={post.id} style={{ animationDelay: `${i * 0.04}s` }}>
          <PostCard post={post as any} currentUserId={user.id} />
        </div>
      ))}

      {hasMore && <LoadMore currentPage={currentPage} currentTab={currentTab} />}
    </main>
  )
}