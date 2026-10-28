export const PUBLIC_INFO_PATHS = ['/', '/help', '/privacy', '/terms', '/community-guidelines']
const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback', '/auth/confirm']
const PUBLIC_ASSETS = ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest']

export function isPublicRoute(pathname: string) {
  return [...PUBLIC_INFO_PATHS, ...AUTH_PATHS, ...PUBLIC_ASSETS].includes(pathname)
}

export function isAuthPage(pathname: string) {
  return AUTH_PATHS.includes(pathname)
}
