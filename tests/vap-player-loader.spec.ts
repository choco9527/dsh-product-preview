import { expect, it } from 'vitest'
import { loadVapFactory, vapFactory } from '../src/client/vap-player-loader.ts'

it('accepts direct exports and CommonJS default wrappers', () => {
  const factory = () => {}
  expect(vapFactory(factory)).toBe(factory)
  expect(vapFactory({ default: factory })).toBe(factory)
  expect(() => vapFactory({})).toThrow('export unavailable')
})
it('loads a callable factory from the real installed VAP package', async () => {
  expect(typeof await loadVapFactory()).toBe('function')
})
