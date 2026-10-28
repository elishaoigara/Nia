import { describe, expect, it } from 'vitest'
import { sortCommentRoots } from './comment-sort'

describe('comment sorting', () => {
  it('orders roots without mutating them or rearranging replies', () => {
    const older = { id: 'old', created_at: '2025-01-01T00:00:00Z', children: [{ id: 'reply' }] }
    const newer = { id: 'new', created_at: '2025-02-01T00:00:00Z', children: [] }
    const roots = [newer, older]
    expect(sortCommentRoots(roots, 'oldest')).toEqual([older, newer])
    expect(sortCommentRoots(roots, 'newest')).toEqual([newer, older])
    expect(roots).toEqual([newer, older])
    expect(older.children).toEqual([{ id: 'reply' }])
  })
})
