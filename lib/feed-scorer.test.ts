import { describe, expect, it } from 'vitest'
import { scorePosts, type ScorerPost, type UserContext } from './feed-scorer'

function post(overrides: Partial<ScorerPost> = {}): ScorerPost {
  return {
    id: 'post-1',
    user_id: 'author-1',
    content: 'Hello Africa',
    created_at: new Date().toISOString(),
    media_url: null,
    media_type: null,
    language: 'swahili',
    profiles: { id: 'author-1', username: 'author', avatar_url: null, country: 'Kenya' },
    likes: [],
    comments: [],
    reposts: [],
    ...overrides,
  }
}

function context(overrides: Partial<UserContext> = {}): UserContext {
  return {
    userId: 'viewer',
    followingIds: new Set(),
    blockedIds: new Set(),
    mutedIds: new Set(),
    country: 'Kenya',
    language: 'swahili',
    ...overrides,
  }
}

describe('scorePosts', () => {
  it('keeps a new post discoverable before it has engagement', () => {
    expect(scorePosts([post()], context())).toHaveLength(1)
  })

  it('filters own, blocked, muted, and invalid posts', () => {
    const result = scorePosts([
      post({ id: 'own', user_id: 'viewer' }),
      post({ id: 'blocked', user_id: 'blocked-user' }),
      post({ id: 'muted', user_id: 'muted-user' }),
      post({ id: 'invalid', user_id: 'other', created_at: 'not-a-date' }),
    ], context({
      blockedIds: new Set(['blocked-user']),
      mutedIds: new Set(['muted-user']),
    }))

    expect(result).toEqual([])
  })

  it('ranks a followed author above an equivalent out-of-network author', () => {
    const followed = post({ id: 'followed', user_id: 'followed-user' })
    const other = post({ id: 'other', user_id: 'other-user' })

    const result = scorePosts(
      [other, followed],
      context({ followingIds: new Set(['followed-user']) }),
    )

    expect(result.map(item => item.id)).toEqual(['followed', 'other'])
  })

  it('boosts authors who share an interest with the viewer', () => {
    const shared = post({
      id: 'shared',
      user_id: 'shared-user',
      profiles: { id: 'shared-user', username: 'shared', avatar_url: null, country: 'Ghana', interests: ['Music'] },
    })
    const unrelated = post({
      id: 'unrelated',
      user_id: 'unrelated-user',
      profiles: { id: 'unrelated-user', username: 'unrelated', avatar_url: null, country: 'Ghana', interests: ['Agriculture'] },
    })

    const result = scorePosts(
      [unrelated, shared],
      context({ country: 'Ghana', interests: new Set(['music']) }),
    )

    expect(result.map(item => item.id)).toEqual(['shared', 'unrelated'])
  })
})
