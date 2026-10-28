import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/app-url'
import { PUBLIC_INFO_PATHS } from '@/lib/public-routes'

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV === 'preview') return []
  return PUBLIC_INFO_PATHS.map(path => ({ url: `${getAppUrl()}${path}`, changeFrequency: 'monthly', priority: path === '/' ? 1 : 0.5 }))
}
