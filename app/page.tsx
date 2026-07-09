import { createClient }  from '@/lib/supabase/server'
import { redirect }       from 'next/navigation'
import CreatePost         from '@/components/CreatePost'
import PostCard           from '@/components/PostCard'
import LoadMore           from '@/components/LoadMore'
import FeedTabs           from '@/components/FeedTabs'
import StoriesBar         from '@/components/StoriesBar'
import HomeRail           from '@/components/HomeRail'
import { Suspense }       from 'react'
import { scorePosts }     from '@/lib/feed-scorer'
import { scoreFlicks }    from '@/lib/flicks-scorer'
import type { UserContext, ScorerPost } from '@/lib/feed-scorer'

const PAGE_SIZE      = 15
const POOL_MULTIPLIER = 6
const TRENDING_FLICKS_LIMIT = 10
const TRENDING_WINDOW_HOURS = 72

const BASE_SELECT = `
  *,
  profiles:user_id (id, username, full_name, avatar_url, country, city),
  circles:circle_id (id, name, slug),
  likes (user_id),
  comments (id, profiles:user_id (id, username, avatar_url)),
  reactions (user_id, emoji),
  reposts (user_id),
  bookmarks (user_id),
  polls:polls (*)
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

  const { data: profileCheck } = await supabase
    .from('profiles').select('id').eq('id', user.id).single()
  if (!profileCheck) redirect('/onboarding')

  const [profileRes, followsRes, blocksRes, mutesRes] = await Promise.all([
    supabase.from('profiles').select('country, language').eq('id', user.id).single(),
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
    supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id),
    supabase.from('mutes').select('muted_id').eq('muter_id', user.id),
  ])

  const myProfile = profileRes.data
  const ctx: UserContext = {
    userId:       user.id,
    followingIds: new Set(((followsRes.data ?? []) as any[]).map((f: any) => f.following_id)),
    blockedIds:   new Set(((blocksRes.data  ?? []) as any[]).map((b: any) => b.blocked_id)),
    mutedIds:     new Set(((mutesRes.data   ?? []) as any[]).map((m: any) => m.muted_id)),
    country:      myProfile?.country  ?? null,
    language:     myProfile?.language ?? null,
  }

  const candidatePool = PAGE_SIZE * POOL_MULTIPLIER * currentPage
  let candidates: ScorerPost[] = []

  // "Your Circles" + "Trending Flicks" for the combined home rail. Both are
  // independent of the feed tab, so they run once alongside (not blocking)
  // the tab-specific candidates query below.
  const trendingSince = new Date(Date.now() - TRENDING_WINDOW_HOURS * 3600_000).toISOString()
  const [{ data: myCircleRows }, { data: trendingRows }] = await Promise.all([
    supabase.from('circle_members')
      .select('circles:circle_id (id, name, slug, category)')
      .eq('user_id', user.id)
      .limit(12),
    supabase.from('posts')
      .select(`
        id, user_id, content, media_url, thumbnail_url, created_at, language, video_duration, category,
        profiles:user_id (id, username, avatar_url, country),
        likes (user_id),
        comments (id),
        reposts (user_id)
      `)
      .eq('media_type', 'video')
      .not('media_url', 'is', null)
      .gte('created_at', trendingSince)
      .order('created_at', { ascending: false })
      .limit(60),
  ])
  const myCircles = ((myCircleRows as any[]) ?? []).map(r => r.circles).filter(Boolean)
  const trendingFlicks = scoreFlicks((trendingRows as any[]) ?? [], ctx).slice(0, TRENDING_FLICKS_LIMIT)

  if (currentTab === 'following') {
    if (ctx.followingIds.size > 0) {
      const { data } = await supabase
        .from('posts').select(BASE_SELECT)
        .in('user_id', [...ctx.followingIds])
        .order('created_at', { ascending: false })
        .limit(candidatePool)
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
        .limit(candidatePool)
      candidates = (data ?? []) as ScorerPost[]
    }
  } else {
    const { data } = await supabase
      .from('posts').select(BASE_SELECT)
      .order('created_at', { ascending: false })
      .limit(candidatePool)
    candidates = (data ?? []) as ScorerPost[]
  }

  const ranked = scorePosts(candidates, ctx)
  const pageSlice = ranked.slice(offset, offset + PAGE_SIZE)
  const posts = pageSlice.map(p => ({
    ...p,
    viewer_is_following: ctx.followingIds.has((p as any).user_id),
  })) as ScorerPost[]
  const hasMore = ranked.length > offset + PAGE_SIZE || candidates.length === candidatePool

  const EMPTY: Record<string, { emoji: string; title: string; body: string }> = {
    africa:    { emoji: '🌍', title: 'Be the first!',      body: 'Start the conversation for all of Africa.' },
    local:     { emoji: '📍', title: 'Nothing local yet',  body: myProfile?.country ? `No posts from ${myProfile.country} yet.` : 'Set your country to see local posts.' },
    following: { emoji: '👀', title: 'No posts yet',       body: 'Follow people to see their posts here.' },
  }
  const empty = EMPTY[currentTab] ?? EMPTY.africa

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', width: '100%' }}>

      {/* Stories */}
      <StoriesBar currentUserId={user.id} />

      {/* Your Circles / Trending Flicks — one combined rail, not two */}
      <HomeRail circles={myCircles as any} flicks={trendingFlicks as any} />

      {/* Feed tabs — sticky under top nav */}
      <Suspense fallback={null}>
        <FeedTabs currentTab={currentTab} />
      </Suspense>

      {/* Compose */}
      <div id="compose">
        <CreatePost userId={user.id} />
      </div>

      {/* Empty state */}
      {posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '72px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{empty.emoji}</div>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>{empty.title}</p>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>{empty.body}</p>
        </div>
      )}

      {/* Posts — flat rows, NO wrapping div with margin/padding */}
      {(posts as ScorerPost[]).map((post: ScorerPost) => (
        <PostCard
          key={post.id}
          post={post as any}
          currentUserId={user.id}
        />
      ))}

      {hasMore && (
        <LoadMore
          currentPage={currentPage}
          currentTab={currentTab}
          currentUserId={user.id}
        />
      )}
    </div>
  )
}