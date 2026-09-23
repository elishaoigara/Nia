import { createClient } from '@/lib/supabase/client'

export type PurposeMode = 'ask' | 'offer' | 'update' | 'opportunity' | 'reflection'

type EventMetadata = Record<string, string | number | boolean | null>

export async function trackEngagement(
  eventName: string,
  userId: string | null | undefined,
  contributionMode?: PurposeMode | null,
  metadata: EventMetadata = {},
) {
  if (!userId) return
  try {
    const supabase = createClient()
    await supabase.from('engagement_events').insert({
      user_id: userId,
      event_name: eventName,
      contribution_mode: contributionMode ?? null,
      metadata,
    })
  } catch {
    // Analytics must never interrupt the contribution or playback experience.
  }
}
