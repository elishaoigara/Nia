import { describe, expect, it } from 'vitest'
import { EMPTY_CREATOR, normaliseCreatorLink, readCreatorInsights, readCreatorLinks, validateCreatorDetails } from './creator'

describe('creator profile validation', () => {
  it('normalises safe links and trims labels', () => {
    expect(normaliseCreatorLink({ label: ' Music ', url: 'https://example.com' })).toEqual({ label: 'Music', url: 'https://example.com/' })
  })
  it.each(['javascript:alert(1)', 'data:text/html,hello', 'http://example.com', 'https://a:b@example.com', '//example.com', 'https://example.com\\@evil.com', 'https://example.com/\nfoo'])('rejects unsafe URL %s', url => {
    expect(() => normaliseCreatorLink({ label: 'Link', url })).toThrow()
  })
  it('enforces category, introduction and link bounds', () => {
    expect(() => validateCreatorDetails({ ...EMPTY_CREATOR, category: 'CEO' })).toThrow()
    expect(() => validateCreatorDetails({ ...EMPTY_CREATOR, introduction: 'a'.repeat(161) })).toThrow()
    expect(() => validateCreatorDetails({ ...EMPTY_CREATOR, links: Array(4).fill({ label: 'Link', url: 'https://example.com' }) })).toThrow()
  })
  it('ignores malformed stored links instead of rendering unsafe anchors', () => {
    expect(readCreatorLinks([{ label: 'Bad', url: 'javascript:alert(1)' }, null, { label: 'Work', url: 'https://example.com' }])).toEqual([{ label: 'Work', url: 'https://example.com/' }])
  })
  it('does not turn missing insights into misleading zero counts', () => {
    expect(() => readCreatorInsights(null)).toThrow()
    expect(() => readCreatorInsights({ saves: 2 })).toThrow()
    expect(readCreatorInsights({ recorded_views: 0, likes_and_reactions: 0, comments: 0, saves: 0, followers: 0, recent_followers: 0 }).saves).toBe(0)
  })
})
