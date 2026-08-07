import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminEnv } from '@/lib/env'

/** Server-only client for trusted webhooks. Never import this from a Client Component. */
export function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseAdminEnv()
  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
