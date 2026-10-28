import type { SupabaseClient } from '@supabase/supabase-js'

type MuteRow = { muted_id: string }

/**
 * Load the current user's mute list.
 *
 * Older deployments may not have applied the mutes migration yet. In that
 * case, treat the list as empty so the feed remains available while the
 * migration is applied. Other database errors are still surfaced.
 */
export async function getMutedIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('mutes')
    .select('muted_id')

  if (error) {
    if (error.code === 'PGRST205' && error.message.includes("'public.mutes'")) {
      console.warn('[supabase] mutes table is missing; using an empty mute list until the migration is applied')
      return []
    }
    throw error
  }

  return ((data ?? []) as MuteRow[]).map(row => row.muted_id)
}
