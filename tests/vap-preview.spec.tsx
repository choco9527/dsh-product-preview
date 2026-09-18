import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { strToU8, zipSync } from 'fflate'
import VapPreview from '../src/client/VapPreview.tsx'

const mock = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('video-animation-player', () => ({ default: mock.create }))
const config = strToU8(JSON.stringify({ info: { w: 10, h: 10, videoW: 20, videoH: 10, fps: 24, rgbFrame: [0, 0, 10, 10], aFrame: [10, 0, 10, 10] } }))
const zip = zipSync({ 'a.mp4': new Uint8Array([0]), 'vapc.json': config })
const t = (key: string) => key
let root: ReactTestRenderer | undefined
let players: ReturnType<typeof makePlayer>[] = []
function makePlayer() {
  const player = { video: { pause: vi.fn(), removeAttribute: vi.fn(), load: vi.fn() }, destroy: vi.fn(), on: vi.fn() }
  player.on.mockImplementation((_event, ready) => { ready(); return player })
  return player
}
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) }) }
beforeEach(() => {
  players = []
  mock.create.mockReset().mockImplementation(() => { const player = makePlayer(); players.push(player); return player })
  vi.stubGlobal('fetch', vi.fn(async () => new Response(zip)))
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
afterEach(async () => {
  act(() => root?.unmount())
  root = undefined
  await settle()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
function mount(url = '/media/one', isZip = true) {
  act(() => { root = create(<VapPreview url={url} zip={isZip} size={zip.length} t={t} />, { createNodeMock: () => ({}) }) })
}
it('plays using original fps and frees the old video and Blob URL on file changes', async () => {
  mount(); await settle()
  expect(mock.create).toHaveBeenCalledWith(expect.objectContaining({ fps: 24, mute: true, loop: true, precache: false }))
  act(() => root!.update(<VapPreview url="/media/two" zip size={zip.length} t={t} />))
  await settle()
  expect(players[0]?.video.pause).toHaveBeenCalledTimes(1)
  expect(players[0]?.destroy).toHaveBeenCalledTimes(1)
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  expect(mock.create).toHaveBeenCalledTimes(2)
})
it('aborts an outstanding read and never mounts a player after unmount', async () => {
  let complete!: (response: Response) => void
  vi.mocked(fetch).mockImplementation(() => new Promise(resolve => { complete = resolve }))
  mount()
  const signal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal
  act(() => root!.unmount()); root = undefined
  expect(signal?.aborted).toBe(true)
  complete(new Response(zip)); await settle()
  expect(mock.create).not.toHaveBeenCalled()
})
it('retains ordinary ZIP and MP4 fallback views without loading a player', async () => {
  vi.mocked(fetch).mockImplementation(async () => new Response(zipSync({ 'readme.txt': strToU8('text') })))
  mount(); await settle()
  expect(root?.root.findByType('p').children).toEqual(['fileOnly'])
  vi.mocked(fetch).mockImplementation(async () => new Response(new Uint8Array([0, 0, 0, 8, 102, 116, 121, 112])))
  act(() => root!.update(<VapPreview url="/plain.mp4" zip={false} size={8} t={t} />))
  await settle()
  expect(root?.root.findByType('video').props.src).toBe('/plain.mp4')
  expect(mock.create).not.toHaveBeenCalled()
})
it('shows a recoverable error when the renderer cannot start', async () => {
  mock.create.mockImplementation(() => { throw Error('WebGL unavailable') })
  mount(); await settle()
  expect(root?.root.findByType('p').children).toEqual(['vapFailed'])
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
})
