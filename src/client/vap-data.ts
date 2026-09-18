/** Bounded local VAP decoding; archive entries are never written to disk. */
import { unzipSync } from 'fflate/browser'

export const MAX_VAP_BYTES = 64 * 1024 * 1024
const MAX_CONFIG_BYTES = 1024 * 1024
type Rectangle = readonly [number, number, number, number]
export interface VapData {
  readonly info: {
    readonly w: number; readonly h: number; readonly fps: number
    readonly videoW: number; readonly videoH: number
    readonly rgbFrame: Rectangle; readonly aFrame: Rectangle
  }
}
export interface VapSource { readonly video: Uint8Array<ArrayBuffer>; readonly config: VapData }

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw Error('Invalid VAP object')
  return value as Record<string, unknown>
}
function dimension(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 8192) throw Error('Invalid VAP dimension')
  return value
}
function rectangle(value: unknown, width: number, height: number): Rectangle {
  if (!Array.isArray(value) || value.length !== 4 || !value.every(item => Number.isInteger(item) && item >= 0)) throw Error('Invalid VAP rectangle')
  const [x, y, w, h] = value as [number, number, number, number]
  if (!w || !h || x + w > width || y + h > height) throw Error('VAP rectangle outside video')
  return [x, y, w, h]
}
/** Validate only self-contained alpha video; dynamic VAPX resources need separate bindings. */
export function parseVapConfig(bytes: Uint8Array): VapData {
  if (bytes.length > MAX_CONFIG_BYTES) throw Error('VAP config too large')
  const data = record(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)))
  const info = record(data.info)
  if ((info.isVapx !== undefined && info.isVapx !== 0) || (data.src !== undefined && (!Array.isArray(data.src) || data.src.length > 0))) throw Error('VAPX bindings are unsupported')
  const w = dimension(info.w), h = dimension(info.h)
  const videoW = dimension(info.videoW), videoH = dimension(info.videoH)
  if (typeof info.fps !== 'number' || !Number.isFinite(info.fps) || info.fps <= 0 || info.fps > 120) throw Error('Invalid VAP fps')
  return { info: { w, h, videoW, videoH, fps: info.fps, rgbFrame: rectangle(info.rgbFrame, videoW, videoH), aFrame: rectangle(info.aFrame, videoW, videoH) } }
}
/** Walk ISO BMFF top-level boxes with checked progress, including extended-size boxes. */
export function embeddedVapConfig(bytes: Uint8Array): VapData | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 0
  while (offset + 8 <= bytes.length) {
    const small = view.getUint32(offset)
    const extended = small === 1
    const header = extended ? 16 : 8
    if (offset + header > bytes.length) throw Error('Truncated MP4 box')
    const length = small === 0 ? bytes.length - offset : extended ? Number(view.getBigUint64(offset + 8)) : small
    if (!Number.isSafeInteger(length) || length < header || length > bytes.length - offset) throw Error('Invalid MP4 box length')
    if (view.getUint32(offset + 4) === 0x76617063) return parseVapConfig(bytes.subarray(offset + header, offset + length))
    offset += length
  }
  return undefined
}
/** Read one MP4 and optional companion config; reject ambiguous or oversized archives. */
export function decodeVap(bytes: Uint8Array, zip: boolean): VapSource | undefined {
  if (bytes.length > MAX_VAP_BYTES) throw Error('VAP preview too large')
  if (!zip) {
    const config = embeddedVapConfig(bytes)
    return config === undefined ? undefined : { video: new Uint8Array(bytes), config }
  }
  let total = 0
  let count = 0
  const names = new Set<string>()
  const files = unzipSync(bytes, { filter(entry) {
    if (++count > 128) throw Error('Too many ZIP entries')
    if (!/(?:\.mp4|(?:^|\/)vapc\.json)$/iu.test(entry.name) || entry.name.startsWith('__MACOSX/')) return false
    if (names.has(entry.name)) throw Error('Duplicate VAP entry')
    names.add(entry.name)
    if (entry.name.split(/[\\/]/u).some(part => part === '..') || /^[\\/]|^[a-z]:/iu.test(entry.name)) throw Error('Unsafe ZIP path')
    total += Math.max(entry.originalSize, entry.size)
    if (total > MAX_VAP_BYTES || (/\.json$/iu.test(entry.name) && entry.originalSize > MAX_CONFIG_BYTES)) throw Error('Expanded VAP too large')
    return true
  } })
  const entries = Object.entries(files)
  const videos = entries.filter(([name]) => /\.mp4$/iu.test(name))
  const configs = entries.filter(([name]) => /(?:^|\/)vapc\.json$/iu.test(name))
  if (videos.length === 0) return undefined
  if (videos.length !== 1 || configs.length > 1) throw Error('Ambiguous VAP ZIP')
  const video = videos[0]![1]
  const config = configs.length === 1 ? parseVapConfig(configs[0]![1]) : embeddedVapConfig(video)
  return config === undefined ? undefined : { video: new Uint8Array(video), config }
}

/** Bound actual response bytes as well as advertised length, and release the reader. */
export async function readVapResponse(response: Response): Promise<Uint8Array<ArrayBuffer>> {
  if (!response.ok || Number(response.headers.get('content-length')) > MAX_VAP_BYTES || response.body === null) throw Error('VAP request unavailable')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const next = await reader.read()
      if (next.done) break
      size += next.value.length
      if (size > MAX_VAP_BYTES) throw Error('VAP preview too large')
      chunks.push(next.value)
    }
  } finally { await reader.cancel(); reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return bytes
}
