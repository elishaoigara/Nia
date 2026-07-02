// lib/video-categories.ts
// Single source of truth for the fixed category taxonomy used to tag video
// posts at upload time (CreatePost) and to browse/filter them (Flicks / Long Flicks).
// Keep this list in sync with any `category` check-constraint added in the DB migration.

export interface VideoCategory {
  id: string
  label: string
  emoji: string
}

export const VIDEO_CATEGORIES: VideoCategory[] = [
  { id: 'comedy',    label: 'Comedy',              emoji: '😂' },
  { id: 'music',     label: 'Music & Dance',       emoji: '🎵' },
  { id: 'sports',    label: 'Sports',               emoji: '⚽' },
  { id: 'news',      label: 'News & Politics',     emoji: '📰' },
  { id: 'education', label: 'Education',            emoji: '🎓' },
  { id: 'culture',   label: 'Culture & Lifestyle', emoji: '🌍' },
  { id: 'tech',      label: 'Tech',                  emoji: '💻' },
  { id: 'vlogs',     label: 'Vlogs',                 emoji: '📹' },
  { id: 'other',     label: 'Other',                 emoji: '✨' },
]

export function getCategoryMeta(id?: string | null): VideoCategory {
  return VIDEO_CATEGORIES.find(c => c.id === id) ?? VIDEO_CATEGORIES[VIDEO_CATEGORIES.length - 1]
}
