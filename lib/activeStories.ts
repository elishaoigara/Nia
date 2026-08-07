import { createClient } from '@/lib/supabase/client'
import type { StoryRow, StoryViewRow } from '@/types/domain'

type StoryRingData = { active: Set<string>; unseen: Set<string> }

type CacheEntry = {
  viewerId: string | null
  data: StoryRingData
  expires: number
}

type InflightEntry = {
  viewerId: string | null
  promise: Promise<StoryRingData>
}

// A feed renders many PostCards at once. This shared, short-lived cache and
// in-flight de-duplication keep a screenful of cards to two queries total.
let cache: CacheEntry | null = null
let inflight: InflightEntry | null = null
const TTL_MS = 30_000

export async function getStoryRingData(viewerId: string | null): Promise<StoryRingData> {
  const now = Date.now()
  if (cache?.viewerId === viewerId && cache.expires > now) return cache.data
  if (inflight?.viewerId === viewerId) return inflight.promise

  const promise = (async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('stories')
      .select('id, user_id')
      .gte('expires_at', new Date().toISOString())
    if (error) throw error

    const stories = (data ?? []) as StoryRow[]
    const active = new Set(stories.map(story => story.user_id))
    const unseen = new Set<string>()

    if (viewerId && stories.length > 0) {
      const { data: viewData, error: viewsError } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', viewerId)
      if (viewsError) throw viewsError

      const viewedIds = new Set(
        ((viewData ?? []) as StoryViewRow[]).map(view => view.story_id),
      )
      for (const story of stories) {
        if (!viewedIds.has(story.id)) unseen.add(story.user_id)
      }
    }

    const result = { active, unseen }
    cache = { viewerId, data: result, expires: Date.now() + TTL_MS }
    return result
  })()

  inflight = { viewerId, promise }
  try {
    return await promise
  } finally {
    if (inflight?.promise === promise) inflight = null
  }
}

export function invalidateStoryRingCache() {
  cache = null
}
