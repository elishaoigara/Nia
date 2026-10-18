import type { Database } from '@/types/database'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { publicSupabaseEnv } from '@/lib/env'

let browserClient: SupabaseClient<Database> | undefined

/** Returns one browser client per tab so auth and realtime subscriptions are shared. */
export function createClient(): SupabaseClient<Database> {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      publicSupabaseEnv.url,
      publicSupabaseEnv.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      },
    )
  }

  return browserClient
}
