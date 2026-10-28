const SUPABASE_PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const SUPABASE_PLACEHOLDER_KEY = 'public-anon-key-not-configured'

export class ConfigurationError extends Error {
  constructor(variable: string) {
    super(`Missing required environment variable: ${variable}`)
    this.name = 'ConfigurationError'
  }
}

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) throw new ConfigurationError(name)
  return value.trim()
}

/**
 * Browser components are pre-rendered during builds, where deployment secrets
 * may intentionally be absent. Placeholders keep that render deterministic;
 * `isSupabaseConfigured` lets the UI avoid issuing requests until configured.
 */
export const publicSupabaseEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || SUPABASE_PLACEHOLDER_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || SUPABASE_PLACEHOLDER_KEY,
  isConfigured: Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  ),
} as const

export function getServerSupabaseEnv() {
  return {
    url: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  }
}

export function getAnthropicApiKey(): string {
  return required('ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY)
}
