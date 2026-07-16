import { createClient } from '@/lib/supabase/client'

type StoryRingData = { active: Set<string>; unseen: Set<string> }

// A feed renders many PostCards at once — without this cache, each one
// would independently query `stories` and `story_views` for the same data.
// One shared, short-lived cache (with in-flight de-duplication) means a
// whole screenful of posts costs two queries total, not two-per-post.
let cache: { viewerId: string | null; data: StoryRingData; expires: number } | null = null
let inflight: Promise<StoryRingData> | null = null
const TTL_MS = 30_000

export async function getStoryRingData(viewerId: string | null): Promise<StoryRingData> {
  const now = Date.now()
  if (cache && cache.viewerId === viewerId && cache.expires > now) return cache.data
  if (inflight) return inflight

  inflight = (async () => {
    const supabase = createClient()
    const { data: stories } = await supabase
      .from('stories')
      .select('id, user_id')
      .gte('expires_at', new Date().toISOString())

    const active = new Set<string>((stories ?? []).map((s: any) => s.user_id))
    const unseen = new Set<string>()

    if (viewerId && stories && stories.length > 0) {
      const { data: views } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', viewerId)
      const viewedIds = new Set((views ?? []).map((v: any) => v.story_id))
      for (const s of stories as any[]) {
        if (!viewedIds.has(s.id)) unseen.add(s.user_id)
      }
    }

    const result = { active, unseen }
    cache = { viewerId, data: result, expires: Date.now() + TTL_MS }
    inflight = null
    return result
  })()

  return inflight
}

// Call after posting/viewing a story so the next render picks up fresh data
// instead of waiting out the full TTL.
export function invalidateStoryRingCache() {
  cache = null
}