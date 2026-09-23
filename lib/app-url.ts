export const PRODUCTION_APP_URL = 'https://niaapp.app'

/** Canonical URLs for metadata and sharing. Auth stays on the initiating host. */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) return new URL(configured).origin
  return PRODUCTION_APP_URL
}

export function getAuthUrl(path: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : getAppUrl()
  return new URL(path, origin).href
}
