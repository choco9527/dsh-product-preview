import { describe, expect, it, vi } from 'vitest'
vi.mock('svga.lite', () => ({ Parser: class {}, Player: class {} }))
import { inject } from '../src/client/index.ts'

describe('product preview client entry', () => {
  it('declares every service read during view registration', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })
})
