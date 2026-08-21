import { createClient }  from '@/lib/supabase/server'
import { redirect }       from 'next/navigation'
import CreatePost         from '@/components/CreatePost'
import PostCard           from '@/components/PostCard'
import LoadMore           from '@/components/LoadMore'
import FeedTabs           from '@/components/FeedTabs'
import StoriesBar         from '@/components/StoriesBar'
import HomeRail            from '@/components/HomeRail'
import {
  HomeHeader,
  NextStepCard,
  CircleShelf,
  CirclePulseFeed,
  PurposeComposer,
  type CirclePulseItem,
} from '@/components/HomeCircleFirst'

import WelcomeBanner      from '@/components/WelcomeBanner'
import { Suspense }       from 'react'
import { scorePosts }     from '@/lib/feed-scorer'
import { scoreFlicks }    from '@/lib/flicks-scorer'
import type { UserContext, ScorerPost } from '@/lib/feed-scorer'
import type { HomeCircle, HomeFlick } from '@/components/HomeRail'
import type { BlockRow, FollowRow } from '@/types/domain'
import { hoursAgoIso } from '@/lib/date'
import { getMutedIds } from '@/lib/supabase/mutes'

const PAGE_SIZE      = 15
const POOL_MULTIPLIER = 6
const TRENDING_FLICKS_LIMIT = 10
const TRENDING_WINDOW_HOURS = 72

const BASE_SELECT = `
  *,
  profiles:user_id (id, username, full_name, avatar_url, country, city, interests),
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
  const parsedPage = Number.parseInt(page ?? '1', 10)
  const currentPage = Number.isFinite(parsedPage) ? Math.min(Math.max(parsedPage, 1), 100) : 1
  const currentTab = tab === 'local' || tab === 'following' ? tab : 'africa'
  const offset = (currentPage - 1) * PAGE_SIZE

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileCheck, error: profileCheckError } = await supabase
    .from('profiles').select('id').eq('id', user.id).maybeSingle()
  if (profileCheckError) throw profileCheckError
  if (!profileCheck) redirect('/onboarding')

  const [profileRes, followsRes, blocksRes, mutedIds] = await Promise.all([
    supabase.from('profiles').select('full_name, country, language, interests').eq('id', user.id).single(),
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
    supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id),
    getMutedIds(supabase),
  ])

  const contextError = profileRes.error ?? followsRes.error ?? blocksRes.error
  if (contextError) throw contextError

  const myProfile = profileRes.data
  const ctx: UserContext = {
    userId:       user.id,
    followingIds: new Set(((followsRes.data as FollowRow[] | null) ?? []).map(f => f.following_id)),
    blockedIds: new Set(((blocksRes.data as BlockRow[] | null) ?? []).map(b => b.blocked_id)),
    mutedIds: new Set(mutedIds),
    country:      myProfile?.country  ?? null,
    language:     myProfile?.language ?? null,
    interests:    new Set(((myProfile?.interests as string[] | null | undefined) ?? []).map((interest: string) => interest.toLowerCase())),
  }

  const candidatePool = PAGE_SIZE * POOL_MULTIPLIER * currentPage
  let candidates: ScorerPost[] = []

  // "Your Circles" + "Trending Flicks" for the combined home rail. Both are
  // independent of the feed tab, so they run once alongside (not blocking)
  // the tab-specific candidates query below.
  const trendingSince = hoursAgoIso(TRENDING_WINDOW_HOURS)
  const [circleResponse, trendingResponse, recommendedCircleResponse] = await Promise.all([
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
    supabase.rpc('get_recommended_circles', { p_user_id: user.id, p_limit: 6 }),
  ])
  const railError = circleResponse.error ?? trendingResponse.error
  if (railError) throw railError
  const circleRows = (circleResponse.data ?? []) as unknown as { circles: HomeCircle | null }[]
  const myCircles = circleRows
    .map(row => row.circles)
    .filter((circle): circle is HomeCircle => circle !== null)

  const pulseResponse = myCircles.length > 0
    ? await supabase.from('posts').select(`
        id, circle_id, content, contribution_mode, created_at,
        profiles:user_id (username, full_name, avatar_url),
        circles:circle_id (name, slug)
      `).in('circle_id', myCircles.map(circle => circle.id)).not('content', 'is', null).order('created_at', { ascending: false }).limit(4)
    : { data: [], error: null }
  const circlePulseItems = ((pulseResponse.data ?? []) as unknown as Array<{
    id: string
    circle_id: string
    content: string
    contribution_mode: 'ask' | 'offer' | 'update' | 'opportunity' | 'reflection' | null
    created_at: string
    profiles: { username?: string | null; full_name?: string | null; avatar_url?: string | null } | null
    circles: { name: string; slug: string } | null
  }>).filter(item => item.circles).map(item => ({
    id: item.id,
    circleId: item.circle_id,
    circleName: item.circles?.name ?? 'Your Circle',
    circleSlug: item.circles?.slug ?? '',
    authorName: item.profiles?.full_name || `@${item.profiles?.username ?? 'member'}`,
    authorAvatar: item.profiles?.avatar_url ?? null,
    content: item.content,
    createdAt: item.created_at,
    mode: item.contribution_mode ?? 'reflection',
    type: 'conversation' as const,
  })) as CirclePulseItem[]
  const suggestedCircles = !recommendedCircleResponse.error
    ? ((recommendedCircleResponse.data ?? []) as { id: string; name: string; slug: string; category: string | null }[]).map(circle => ({
        id: circle.id,
        name: circle.name,
        slug: circle.slug,
        category: circle.category,
      })) as HomeCircle[]
    : []
  const trendingFlicks = scoreFlicks(
    (trendingResponse.data ?? []) as unknown as ScorerPost[],
    ctx,
  ).slice(0, TRENDING_FLICKS_LIMIT) as HomeFlick[]

  if (currentTab === 'following') {
    if (ctx.followingIds.size > 0) {
      const { data, error } = await supabase
        .from('posts').select(BASE_SELECT)
        .in('user_id', [...ctx.followingIds])
        .order('created_at', { ascending: false })
        .limit(candidatePool)
      if (error) throw error
      candidates = (data ?? []) as unknown as ScorerPost[]
    }
  } else if (currentTab === 'local' && myProfile?.country) {
    const { data: countryUsers, error: countryError } = await supabase
      .from('profiles').select('id').eq('country', myProfile.country)
    if (countryError) throw countryError
    const countryIds = ((countryUsers ?? []) as { id: string }[]).map(profile => profile.id)
    if (countryIds.length > 0) {
      const { data, error } = await supabase
        .from('posts').select(BASE_SELECT)
        .in('user_id', countryIds)
        .order('created_at', { ascending: false })
        .limit(candidatePool)
      if (error) throw error
      candidates = (data ?? []) as unknown as ScorerPost[]
    }
  } else {
    const { data, error } = await supabase
      .from('posts').select(BASE_SELECT)
      .order('created_at', { ascending: false })
      .limit(candidatePool)
    if (error) throw error
    candidates = (data ?? []) as unknown as ScorerPost[]
  }

  const ranked = scorePosts(candidates, ctx)
  const pageSlice = ranked.slice(offset, offset + PAGE_SIZE)
  const posts = pageSlice.map(p => ({
    ...p,
    viewer_is_following: ctx.followingIds.has(p.user_id),
  })) as ScorerPost[]
  const hasMore = ranked.length > offset + PAGE_SIZE || candidates.length === candidatePool

  const EMPTY: Record<string, { emoji: string; title: string; body: string }> = {
    africa:    { emoji: '🌍', title: 'Start the conversation', body: 'Share the first post for all of Africa to see.' },
    local:     { emoji: '📍', title: 'Your local feed lights up once neighbours join', body: myProfile?.country ? `Be the first to post from ${myProfile.country}.` : 'Set your country in your profile to see local posts.' },
    following: { emoji: '👀', title: 'Find your circle',    body: 'Follow people or join a Circle to fill this feed.' },
  }
  const empty = EMPTY[currentTab] ?? EMPTY.africa

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', width: '100%' }}>

      <WelcomeBanner />

      <HomeHeader
        displayName={myProfile?.full_name?.split(' ')[0] || 'friend'}
        activeCircleCount={myCircles.length}
        needsResponseCount={0}
      />
      <NextStepCard circle={myCircles[0] ?? null} hasActivity={circlePulseItems.length > 0} />
      <CircleShelf circles={myCircles} />
      <CirclePulseFeed items={circlePulseItems} />
      <PurposeComposer userId={user.id} circles={myCircles} />

      {/* Broader discovery remains available below the Circle layer. */}
      <HomeRail circles={[]} suggestedCircles={suggestedCircles} flicks={trendingFlicks} currentUserId={user.id} />

      {/* Stories remain available below the Circle layer. */}
      <StoriesBar currentUserId={user.id} />

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
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={user.id}
        />
      ))}

      {hasMore && (
        <LoadMore
          key={`${currentTab}:${currentPage}`}
          currentPage={currentPage}
          currentTab={currentTab}
          currentUserId={user.id}
        />
      )}
    </div>
  )
}