import { describe, expect, it } from 'vitest'
import { hasNewAcceptedMessage } from '../src/client/submission-navigation.ts'

const before = { sessionId: 'one', latestSeq: 20, queueIds: ['existing'] }
describe('artifact view submission navigation', () => {
  it('returns to chat for an admitted message or a newly queued message', () => {
    expect(hasNewAcceptedMessage(before, { ...before, latestSeq: 21 })).toBe(true)
    expect(hasNewAcceptedMessage(before, { ...before, queueIds: ['existing', 'new'] })).toBe(true)
  })
  it('stays for mounting, session switching, failures, and older history', () => {
    expect(hasNewAcceptedMessage(undefined, before)).toBe(false)
    expect(hasNewAcceptedMessage(before, { ...before, sessionId: 'two', latestSeq: 100 })).toBe(false)
    expect(hasNewAcceptedMessage(before, before)).toBe(false)
    expect(hasNewAcceptedMessage(before, { ...before, latestSeq: 10 })).toBe(false)
    expect(hasNewAcceptedMessage(before, { ...before, queueIds: [] })).toBe(false)
  })
})
