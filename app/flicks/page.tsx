import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { scoreFlicks } from '@/lib/flicks-scorer'
import type { ScorerPost, UserContext } from '@/lib/feed-scorer'
import type { BlockRow, FollowRow } from '@/types/domain'
import FlicksClient from './FlicksClient'
import { getMutedIds } from '@/lib/supabase/mutes'
import type { FlickPost } from './FlicksClient'

const SHORT_FLICK_SEC = 60
const SHORTS_LIMIT = 40
const LONGS_LIMIT = 40

const FLICK_SELECT = `
  id, user_id, content, media_url, media_type, created_at, language, video_duration, category, thumbnail_url,
  profiles:user_id (id, username, avatar_url, country),
  likes (user_id),
  comments (id),
  reposts (user_id),
  post_views (id)
`

export default async function ReelsPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>
}) {
  const { v: initialVideoId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Build the same ranking context lib/feed-scorer uses for the main feed
  // (app/api/feed/route.ts) — country/language affinity, in-network boost,
  // blocked/muted hard-filter. scoreFlicks() already existed in lib/flicks-scorer.ts
  // but was never actually called anywhere, so Flicks has just been reverse-
  // chronological this whole time — none of the completion-rate/watch-time/
  // diversity-decay logic was doing anything.
  const [profileRes, followsRes, blocksRes, mutedIds] = await Promise.all([
    supabase.from('profiles').select('country, language').eq('id', user.id).single(),
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
    supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id),
    getMutedIds(supabase),
  ])

  const ctx: UserContext = {
    userId: user.id,
    followingIds: new Set(((followsRes.data as FollowRow[] | null) ?? []).map(f => f.following_id)),
    blockedIds: new Set(((blocksRes.data as BlockRow[] | null) ?? []).map(b => b.blocked_id)),
    mutedIds: new Set(mutedIds),
    country: profileRes.data?.country ?? null,
    language: profileRes.data?.language ?? null,
  }

  // Shorts and longs are now fetched as independent queries. Previously this was
  // one query capped at 60 posts total, split by duration afterwards — if recent
  // uploads skewed short (likely, especially early on), Long Flicks would quietly
  // end up with only a handful of videos even if plenty existed further back.
  const [{ data: shortRows }, { data: unknownDurationRows }, { data: longRows }] = await Promise.all([
    supabase
      .from('posts')
      .select(FLICK_SELECT)
      .eq('media_type', 'video')
      .not('media_url', 'is', null)
      .lte('video_duration', SHORT_FLICK_SEC)
      .order('created_at', { ascending: false })
      .limit(SHORTS_LIMIT),
    // `.lte()` excludes NULLs, so pull older uploads that predate duration
    // tracking into the shorts bucket separately (same behavior as before).
    supabase
      .from('posts')
      .select(FLICK_SELECT)
      .eq('media_type', 'video')
      .not('media_url', 'is', null)
      .is('video_duration', null)
      .order('created_at', { ascending: false })
      .limit(SHORTS_LIMIT),
    supabase
      .from('posts')
      .select(FLICK_SELECT)
      .eq('media_type', 'video')
      .not('media_url', 'is', null)
      .gt('video_duration', SHORT_FLICK_SEC)
      .order('created_at', { ascending: false })
      .limit(LONGS_LIMIT),
  ])

  const shortsRaw = [...(shortRows ?? []), ...(unknownDurationRows ?? [])]

  // Long Flicks stays chronological for now — it's a browse-by-topic grid, not a
  // "for you" feed, so recency + category filtering is the right mental model.
  // The scorer is there if you want a "Trending" sort option later.
  const shorts = scoreFlicks(
    shortsRaw as unknown as ScorerPost[],
    ctx,
  ).slice(0, SHORTS_LIMIT) as unknown as FlickPost[]
  const longs = (longRows ?? []) as unknown as FlickPost[]

  // Resolved independently of the shorts/longs pools above — a video linked in
  // from the home rail's Trending strip may not be among the top-40 in either
  // list, so we fetch it directly rather than searching for it client-side.
  let initialVideo: FlickPost | null = null
  if (initialVideoId) {
    const { data: row } = await supabase
      .from('posts')
      .select(FLICK_SELECT)
      .eq('id', initialVideoId)
      .single()
    if (row) initialVideo = row as unknown as FlickPost
  }

  return <FlicksClient shorts={shorts} longs={longs} currentUserId={user.id} initialVideo={initialVideo} />
}