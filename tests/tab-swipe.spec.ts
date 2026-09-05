import { describe, expect, it } from 'vitest'
import { adjacentTabIndex, horizontalSwipeDirection, swipeProgress } from '../src/client/tab-swipe.ts'

describe('product preview tab swipe', () => {
  it('recognizes only horizontal-dominant wheel input', () => {
    expect(horizontalSwipeDirection(-24, 3)).toBe('previous')
    expect(horizontalSwipeDirection(24, 3)).toBe('next')
    expect(horizontalSwipeDirection(24, 16)).toBeUndefined()
    expect(horizontalSwipeDirection(3, 24)).toBeUndefined()
  })

  it('maps swipe distance to bounded edge-feedback progress', () => {
    expect(swipeProgress(0)).toBe(0)
    expect(swipeProgress(60)).toBe(0.25)
    expect(swipeProgress(-180)).toBe(0.75)
    expect(swipeProgress(-240)).toBe(1)
  })

  it('does not wrap at either end of the tab strip', () => {
    expect(adjacentTabIndex(0, 3, 'previous')).toBeUndefined()
    expect(adjacentTabIndex(0, 3, 'next')).toBe(1)
    expect(adjacentTabIndex(2, 3, 'next')).toBeUndefined()
  })
})
