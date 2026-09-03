import { describe, expect, it } from 'vitest'
import { inject } from '../src/client/index.ts'

describe('product preview client entry', () => {
  it('declares every service read during view registration', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })
})
