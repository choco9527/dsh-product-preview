import { describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { decodeVap, embeddedVapConfig, MAX_VAP_BYTES, parseVapConfig, readVapResponse } from '../src/client/vap-data.ts'

const info = { w: 720, h: 1280, videoW: 1088, videoH: 1280, fps: 24, rgbFrame: [0, 0, 720, 1280], aFrame: [724, 0, 360, 640], isVapx: 0 }
const config = strToU8(JSON.stringify({ info }))
function box(type: string, data = new Uint8Array(), extended = false) {
  const bytes = new Uint8Array((extended ? 16 : 8) + data.length)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, extended ? 1 : bytes.length)
  bytes.set(strToU8(type), 4)
  if (extended) view.setBigUint64(8, BigInt(bytes.length))
  bytes.set(data, extended ? 16 : 8)
  return bytes
}
const mp4 = box('ftyp')
describe('VAP source decoding', () => {
  it('preserves original fps and alpha layout from embedded and companion configs', () => {
    expect(embeddedVapConfig(box('vapc', config))).toMatchObject({ info: { fps: 24, aFrame: info.aFrame } })
    expect(embeddedVapConfig(box('vapc', config, true))).toMatchObject({ info: { fps: 24 } })
    const result = decodeVap(zipSync({ 'folder/礼物.mp4': mp4, 'folder/vapc.json': config }), true)
    expect(result?.video).toEqual(mp4)
    expect(result?.config.info.fps).toBe(24)
  })
  it('handles embedded metadata inside a ZIP without companion JSON', () => {
    expect(decodeVap(zipSync({ 'video.mp4': box('vapc', config) }), true)?.config.info.w).toBe(720)
  })
  it('keeps ordinary MP4 and ZIP files on their existing presentation path', () => {
    expect(decodeVap(mp4, false)).toBeUndefined()
    expect(decodeVap(zipSync({ 'readme.txt': strToU8('text') }), true)).toBeUndefined()
    expect(decodeVap(zipSync({ 'video.mp4': mp4 }), true)).toBeUndefined()
  })
  it('rejects corrupt lengths without looping and supports terminal zero-length boxes', () => {
    const zero = box('free'); new DataView(zero.buffer).setUint32(0, 0)
    expect(embeddedVapConfig(zero)).toBeUndefined()
    const small = box('vapc'); new DataView(small.buffer).setUint32(0, 2)
    expect(() => embeddedVapConfig(small)).toThrow('length')
    const large = box('vapc'); new DataView(large.buffer).setUint32(0, 100)
    expect(() => embeddedVapConfig(large)).toThrow('length')
    const truncated = box('vapc'); new DataView(truncated.buffer).setUint32(0, 1)
    expect(() => embeddedVapConfig(truncated)).toThrow('Truncated')
  })
  it.each([{ fps: 0 }, { fps: 121 }, { w: 9000 }, { rgbFrame: [0, 0, 2000, 2] }, { aFrame: [-1, 0, 1, 1] }, { isVapx: 1 }])('rejects invalid geometry or unsupported mixing: %j', overrides => {
    expect(() => parseVapConfig(strToU8(JSON.stringify({ info: { ...info, ...overrides } })))).toThrow()
  })
  it('rejects dynamic resource bindings without fetching them', () => {
    expect(() => parseVapConfig(strToU8(JSON.stringify({ info, src: [{ srcTag: 'https://example.test/image' }] })))).toThrow('VAPX')
  })
  it('rejects ambiguous, escaping, corrupt and oversized ZIP inputs', () => {
    expect(() => decodeVap(zipSync({ 'a.mp4': mp4, 'b.mp4': mp4 }), true)).toThrow('Ambiguous')
    expect(() => decodeVap(zipSync({ '../video.mp4': mp4 }), true)).toThrow('Unsafe')
    expect(() => decodeVap(strToU8('broken'), true)).toThrow()
    expect(() => decodeVap(new Uint8Array(MAX_VAP_BYTES + 1), true)).toThrow('too large')
    expect(() => decodeVap(zipSync({ 'vapc.json': new Uint8Array(1024 * 1024 + 1) }), true)).toThrow('too large')
  })
  it('caps entry count even for ignored entries', () => {
    expect(() => decodeVap(zipSync(Object.fromEntries(Array.from({ length: 129 }, (_, i) => [`${i}.txt`, new Uint8Array()]))), true)).toThrow('Too many')
  })
  it('reads actual response data and rejects unavailable or oversized responses', async () => {
    expect(await readVapResponse(new Response(mp4))).toEqual(mp4)
    await expect(readVapResponse(new Response('', { status: 404 }))).rejects.toThrow()
    await expect(readVapResponse(new Response('', { headers: { 'content-length': String(MAX_VAP_BYTES + 1) } }))).rejects.toThrow()
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_VAP_BYTES + 1)); controller.close() } })
    await expect(readVapResponse(new Response(stream))).rejects.toThrow('too large')
  })
})
