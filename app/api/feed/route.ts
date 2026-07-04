import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { scorePosts } from '@/lib/feed-scorer'
import type { UserContext, ScorerPost } from '@/lib/feed-scorer'

const PAGE_SIZE = 15
// Fetch a larger pool per page so the scorer has enough candidates to fill
// a full ranked page after filtering blocked/muted/own posts.
// We multiply by page number so later pages still reach further back in time.
const POOL_MULTIPLIER = 6

const BASE_SELECT = `
  *,
  profiles:user_id (id, username, full_name, avatar_url, country, city),
  circles:circle_id (id, name, slug),
  likes (user_id),
  comments (id),
  reactions (user_id, emoji),
  reposts (user_id),
  bookmarks (user_id),
  polls:polls (*)
`

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const tab  = searchParams.get('tab')  ?? 'africa'
    const page = parseInt(searchParams.get('page') ?? '1')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── 1. Query hydration ─────────────────────────────────────────────────
    const [profileRes, followsRes] = await Promise.all([
      supabase.from('profiles').select('country, language').eq('id', user.id).single(),
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
    ])
    const blocksRes = await supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id)
    const mutesRes  = await supabase.from('mutes').select('muted_id').eq('muter_id', user.id)

    const myProfile = profileRes.data
    const ctx: UserContext = {
      userId:       user.id,
      followingIds: new Set((followsRes.data ?? []).map((f: any) => f.following_id)),
      blockedIds:   new Set((blocksRes.data  ?? []).map((b: any) => b.blocked_id)),
      mutedIds:     new Set((mutesRes.data   ?? []).map((m: any) => m.muted_id)),
      country:      myProfile?.country  ?? null,
      language:     myProfile?.language ?? null,
    }

    // ── 2. Candidate fetch ─────────────────────────────────────────────────
    // Fetch enough candidates to cover all pages up to and including `page`.
    // This means page 2 sees a pool that extends further back in time than
    // page 1, so we don't hit an artificial ceiling at 90 posts.
    const candidatePool = PAGE_SIZE * POOL_MULTIPLIER * page
    let candidates: ScorerPost[] = []

    if (tab === 'following') {
      if (ctx.followingIds.size === 0) {
        return NextResponse.json({ posts: [], hasMore: false })
      }
      const { data } = await supabase
        .from('posts').select(BASE_SELECT)
        .in('user_id', [...ctx.followingIds])
        .order('created_at', { ascending: false })
        .limit(candidatePool)
      candidates = (data ?? []) as ScorerPost[]

    } else if (tab === 'local' && myProfile?.country) {
      const { data: countryUsers } = await supabase
        .from('profiles').select('id').eq('country', myProfile.country)
      const countryIds = (countryUsers ?? []).map((p: any) => p.id)
      if (countryIds.length === 0) {
        return NextResponse.json({ posts: [], hasMore: false })
      }
      const { data } = await supabase
        .from('posts').select(BASE_SELECT)
        .in('user_id', countryIds)
        .order('created_at', { ascending: false })
        .limit(candidatePool)
      candidates = (data ?? []) as ScorerPost[]

    } else {
      const { data } = await supabase
        .from('posts').select(BASE_SELECT)
        .order('created_at', { ascending: false })
        .limit(candidatePool)
      candidates = (data ?? []) as ScorerPost[]
    }

    // ── 3. Score + rank ────────────────────────────────────────────────────
    const ranked  = scorePosts(candidates, ctx)
    const offset  = (page - 1) * PAGE_SIZE
    const pageSlice = ranked.slice(offset, offset + PAGE_SIZE)
    const posts = pageSlice.map(p => ({
      ...p,
      viewer_is_following: ctx.followingIds.has((p as any).user_id),
    }))
    // hasMore is true if there are more ranked posts beyond this page,
    // OR if we hit the candidate pool ceiling (more DB rows likely exist).
    const hasMore = ranked.length > offset + PAGE_SIZE || candidates.length === candidatePool

    return NextResponse.json({ posts, hasMore })

  } catch (err) {
    console.error('[feed] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}