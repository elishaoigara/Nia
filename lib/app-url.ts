/**
 * lib/app-url.ts
 *
 * Returns the canonical app URL for use in auth redirect URLs.
 *
 * Priority:
 *   1. NEXT_PUBLIC_APP_URL  — set this in Vercel env vars to your production domain
 *   2. NEXT_PUBLIC_VERCEL_URL — automatically injected by Vercel on every deploy
 *   3. window.location.origin — genuine fallback for local dev only
 *
 * IMPORTANT: NEXT_PUBLIC_APP_URL must NOT have a trailing slash.
 * Example: https://nia.social   ✅
 *          https://nia.social/  ❌
 */
export function getAppUrl(): string {
  // 1. Explicit override — set in Vercel dashboard for production
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }

  // 2. Vercel auto-injects this on all deployments (preview + production)
  //    It's the raw hostname without protocol, so we add https://
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }

  // 3. Local dev only — window is safe here because this is always called
  //    from client components (signUp / resetPasswordForEmail are client-side)
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // SSR fallback — should never be reached for auth flows
  return 'http://localhost:3000'
}