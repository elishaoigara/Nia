export const CREATOR_CATEGORIES = ['Musician', 'Photographer', 'Comedian', 'Fashion creator', 'Developer', 'Educator', 'Artist', 'Filmmaker', 'Writer', 'Gamer', 'Small business owner', 'Other'] as const
export type CreatorLink = { label: string; url: string }
export type CreatorDetails = { enabled: boolean; category: string; introduction: string; open_to_collaborations: boolean; links: CreatorLink[] }
export const EMPTY_CREATOR: CreatorDetails = { enabled: false, category: '', introduction: '', open_to_collaborations: false, links: [] }

export function normaliseCreatorLink(link: CreatorLink): CreatorLink {
  const label = link.label.trim()
  if (!label || label.length > 40) throw new Error('Give each link a name of 1–40 characters.')
  const raw = link.url.trim()
  if (raw.length > 500 || !/^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::[0-9]{1,5})?(?:[/?#][^\s\\]*)?$/i.test(raw)) {
    throw new Error('Use a complete HTTPS link, such as https://example.com.')
  }
  let url: URL
  try { url = new URL(raw) } catch { throw new Error('That link is not a valid website address.') }
  if (url.username || url.password || url.protocol !== 'https:') throw new Error('Use an HTTPS link without login details.')
  if (url.href.length > 500) throw new Error('Keep each link under 500 characters.')
  return { label, url: url.href }
}

export function validateCreatorDetails(value: CreatorDetails): CreatorDetails {
  if (value.category && !(CREATOR_CATEGORIES as readonly string[]).includes(value.category)) throw new Error('Choose a creator category from the list.')
  if (value.introduction.trim().length > 160) throw new Error('Keep “What I create” within 160 characters.')
  if (value.links.length > 3) throw new Error('You can add up to three links.')
  return { ...value, introduction: value.introduction.trim(), links: value.links.map(normaliseCreatorLink) }
}

export function readCreatorLinks(value: unknown): CreatorLink[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 3).flatMap(link => {
    if (!link || typeof link.label !== 'string' || typeof link.url !== 'string') return []
    try { return [normaliseCreatorLink(link)] } catch { return [] }
  })
}

export type CreatorInsights = { recorded_views: number; likes_and_reactions: number; comments: number; saves: number; followers: number; recent_followers: number }
export function readCreatorInsights(value: unknown): CreatorInsights {
  if (!value || typeof value !== 'object') throw new Error('Insights are unavailable. Please try again.')
  const row = value as Record<string, unknown>
  const keys = ['recorded_views', 'likes_and_reactions', 'comments', 'saves', 'followers', 'recent_followers'] as const
  for (const key of keys) if (typeof row[key] !== 'number' || !Number.isFinite(row[key]) || (row[key] as number) < 0) throw new Error('Insights are unavailable. Please try again.')
  return row as CreatorInsights
}
