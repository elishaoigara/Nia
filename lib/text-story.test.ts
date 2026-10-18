import { describe, expect, it } from 'vitest'
import { createTextStory, wrapStoryText } from './text-story'

describe('text story cards', () => {
  const measure = (value: string) => Array.from(value).length * 10
  it('wraps long unbroken text without dropping characters', () => {
    const input = 'abcdefghijklmnopqrstuvwxyz'
    const lines = wrapStoryText(input, measure, 50)
    expect(lines.join('')).toBe(input)
    expect(lines.every(line => measure(line) <= 50)).toBe(true)
  })
  it('preserves intentional line breaks and emoji code points', () => {
    expect(wrapStoryText('Hello\n\n🌍🌍🌍', measure, 20)).toEqual(['He', 'll', 'o', '', '🌍🌍', '🌍'])
  })
  it('rejects empty and overlong updates before accessing the canvas', async () => {
    await expect(createTextStory('  ', '#000')).rejects.toThrow('between 1 and 280')
    await expect(createTextStory('a'.repeat(281), '#000')).rejects.toThrow('between 1 and 280')
  })
})
