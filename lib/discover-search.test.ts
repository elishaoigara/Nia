import { describe, expect, it } from 'vitest'
import { cleanCircleSearch } from './discover-search'

describe('Circle search input', () => {
 it('keeps multilingual search text while removing filter syntax', () => {
  expect(cleanCircleSearch('  Nairobi, (music)%  ')).toBe('Nairobi music')
  expect(cleanCircleSearch('  muziki wa jamii  ')).toBe('muziki wa jamii')
  expect(cleanCircleSearch('tech.or(id.eq.x)')).toBe('techorideqx')
 })
 it('limits search text to 80 characters', () => {
  expect(cleanCircleSearch('a'.repeat(100))).toHaveLength(80)
 })
})
