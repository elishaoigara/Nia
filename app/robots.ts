import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/app-url'
import { PUBLIC_INFO_PATHS } from '@/lib/public-routes'

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === 'preview') return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
      allow: PUBLIC_INFO_PATHS.map(path => `${path}$`),
    },
    sitemap: `${getAppUrl()}/sitemap.xml`,
  }
}
