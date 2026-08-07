import { describe, expect, it } from 'vitest'
import { scoreFlicks } from './flicks-scorer'
import type { ScorerPost, UserContext } from './feed-scorer'

function flick(overrides: Partial<ScorerPost> = {}): ScorerPost {
  return {
    id: 'flick-1',
    user_id: 'author-1',
    content: null,
    created_at: new Date().toISOString(),
    media_url: 'https://example.com/video.mp4',
    media_type: 'video',
    language: null,
    profiles: { id: 'author-1', username: 'author', avatar_url: null, country: null },
    likes: [],
    comments: [],
    reposts: [],
    ...overrides,
  }
}

const context: UserContext = {
  userId: 'viewer',
  followingIds: new Set(),
  blockedIds: new Set(),
  mutedIds: new Set(),
  country: null,
  language: null,
}

describe('scoreFlicks', () => {
  it('keeps new video uploads discoverable before engagement arrives', () => {
    expect(scoreFlicks([flick()], context)).toHaveLength(1)
  })

  it('hard-filters blocked and muted authors', () => {
    const result = scoreFlicks([
      flick({ id: 'blocked', user_id: 'blocked-user' }),
      flick({ id: 'muted', user_id: 'muted-user' }),
    ], {
      ...context,
      blockedIds: new Set(['blocked-user']),
      mutedIds: new Set(['muted-user']),
    })

    expect(result).toEqual([])
  })

  it('ranks engagement before applying author diversity', () => {
    const result = scoreFlicks([
      flick({ id: 'weak', user_id: 'same-author' }),
      flick({ id: 'strong', user_id: 'same-author', likes: Array.from({ length: 10 }, (_, index) => ({ user_id: `u-${index}` })) }),
      flick({ id: 'other', user_id: 'other-author', likes: [{ user_id: 'u' }] }),
    ], context)

    expect(result[0]?.id).toBe('strong')
  })
})
