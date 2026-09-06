import { describe, expect, it } from 'vitest'
import { computeCropRectangle, formatMediaDuration } from './media-editing'

describe('computeCropRectangle', () => {
  it('keeps the full frame for the original aspect', () => {
    expect(computeCropRectangle(400, 300, null, 1, 0.5, 0.5)).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    })
  })

  it('centers a square crop', () => {
    expect(computeCropRectangle(400, 300, 1, 1, 0.5, 0.5)).toEqual({
      x: 50,
      y: 0,
      width: 300,
      height: 300,
    })
  })

  it('moves a zoomed crop within the available frame', () => {
    expect(computeCropRectangle(400, 300, 1, 2, 1, 0)).toEqual({
      x: 250,
      y: 0,
      width: 150,
      height: 150,
    })
  })
})

describe('formatMediaDuration', () => {
  it('formats seconds for mobile-friendly trim labels', () => {
    expect(formatMediaDuration(0)).toBe('0:00')
    expect(formatMediaDuration(65.4)).toBe('1:05')
    expect(formatMediaDuration(59.9)).toBe('0:59')
  })
})
