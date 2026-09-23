import { getAppUrl } from './app-url'

/** Next may expose its internal listening address behind a reverse proxy. */
export function getAuthRequestOrigin(request: Request): string {
  const requestUrl = new URL(request.url)
  const allowed = new Set([getAppUrl(), 'https://nia-rho.vercel.app', 'https://www.niaapp.app'])
  for (const host of [process.env.VERCEL_URL, process.env.NEXT_PUBLIC_VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
    if (host) allowed.add(`https://${host}`)
  }
  for (const header of ['x-forwarded-host', 'host']) {
    const host = request.headers.get(header)
    if (!host || /[,\s/\\@?#]/.test(host)) continue
    const httpsOrigin = `https://${host}`
    if (allowed.has(httpsOrigin)) return httpsOrigin
    // Only local development may use an unencrypted loopback host.
    if (!process.env.VERCEL && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
      return `${requestUrl.protocol}//${host}`
    }
  }
  if (requestUrl.hostname === '0.0.0.0' || requestUrl.hostname === '[::]') return getAppUrl()
  return requestUrl.origin
}
