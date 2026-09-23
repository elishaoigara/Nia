import { describe, expect, it } from 'vitest'
import {
  isValidUsername,
  normalizeUsername,
  usernameValidationMessage,
} from './validation'

describe('username validation', () => {
  it('normalizes and accepts database-compatible usernames', () => {
    expect(normalizeUsername('  Amara_7 ')).toBe('amara_7')
    expect(isValidUsername('Amara_7')).toBe(true)
    expect(usernameValidationMessage('Amara_7')).toBeNull()
  })

  it('rejects values that violate the database constraint', () => {
    expect(isValidUsername('a')).toBe(false)
    expect(isValidUsername('ama.k')).toBe(false)
    expect(isValidUsername('a'.repeat(31))).toBe(false)
    expect(usernameValidationMessage('ama.k')).toContain('lowercase letters')
  })
})
