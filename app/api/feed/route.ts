import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const tab  = searchParams.get('tab')  ?? 'africa'
    const page = parseInt(searchParams.get('page') ?? '1')
    const offset = (page - 1) * PAGE_SIZE

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
    let candidates: ScorerPost[] = []

    if (tab === 'following') {
      if (ctx.followingIds.size === 0) {
        return NextResponse.json({ posts: [], hasMore: false })
      }
      const { data } = await supabase
        .from('posts').select(BASE_SELECT)
        .in('user_id', [...ctx.followingIds])
        .order('created_at', { ascending: false })
        .limit(CANDIDATE_POOL)
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
        .limit(CANDIDATE_POOL)
      candidates = (data ?? []) as ScorerPost[]

    } else {
      const { data } = await supabase
        .from('posts').select(BASE_SELECT)
        .order('created_at', { ascending: false })
        .limit(CANDIDATE_POOL)
      candidates = (data ?? []) as ScorerPost[]
    }

    // ── 3. Score + rank ────────────────────────────────────────────────────
    const ranked   = scorePosts(candidates, ctx)
    const posts    = ranked.slice(offset, offset + PAGE_SIZE)
    const hasMore  = ranked.length > offset + PAGE_SIZE

    return NextResponse.json({ posts, hasMore })

  } catch (err) {
    console.error('[feed] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}