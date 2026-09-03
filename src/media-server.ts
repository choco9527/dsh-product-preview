/** Same-origin, range-capable access to configured local media roots. */

import { randomBytes } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { isAbsolute, relative } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { productMediaKind, type ProductMediaKind } from './artifacts.ts'

const MAX_REQUEST_BYTES = 8 * 1024
const DEFAULT_TOKEN_TTL_MS = 5 * 60 * 1000
const DEFAULT_MAX_FILE_BYTES = 200 * 1024 * 1024
const MAX_MEDIA_TOKENS = 256
const TOKEN_ID_PATTERN = /^[A-Za-z0-9_-]{32}$/u

export interface ProductPreviewMediaConfig {
  readonly allowedRoots: readonly string[]
  readonly maxFileBytes?: number
  readonly tokenTtlMs?: number
}

export interface ResolvedProductMedia {
  readonly id: string
  readonly kind: ProductMediaKind
  readonly mimeType: string
  readonly size: number
  readonly url: string
}

interface MediaToken extends ResolvedProductMedia {
  readonly path: string
  readonly expiresAt: number
}

function mediaMimeType(kind: ProductMediaKind, path: string): string {
  const extension = path.split('.').at(-1)?.toLowerCase()
  if (kind === 'svga') return 'application/octet-stream'
  if (kind === 'image') {
    return ({ gif: 'image/gif', jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' })[extension ?? ''] ?? 'application/octet-stream'
  }
  return ({ m4v: 'video/x-m4v', mov: 'video/quicktime', mp4: 'video/mp4', webm: 'video/webm' })[extension ?? ''] ?? 'application/octet-stream'
}

function sendJson(response: ServerResponse, statusCode: number, value: object): void {
  response.statusCode = statusCode
  response.setHeader('cache-control', 'no-store')
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('x-content-type-options', 'nosniff')
  response.end(JSON.stringify(value))
}

function requestOrigin(request: IncomingMessage, expectedHost: string): boolean {
  const address = request.socket.remoteAddress
  const loopback = address === '::1' || address === '127.0.0.1'
    || address?.startsWith('127.') === true || address?.startsWith('::ffff:127.') === true
  if (!loopback || request.headers.host?.toLowerCase() !== expectedHost.toLowerCase()) return false
  const origin = request.headers.origin
  if (origin !== undefined) return origin === `http://${expectedHost}`
  return request.headers['sec-fetch-site'] === 'same-origin'
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
    size += buffer.length
    if (size > MAX_REQUEST_BYTES) throw new Error('request is too large')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

function pathRequest(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  return Object.keys(record).length === 1 && typeof record.path === 'string' ? record.path : undefined
}

function isWithinRoot(path: string, root: string): boolean {
  const value = relative(root, path)
  return value === '' || (!value.startsWith('..') && !isAbsolute(value))
}

function singleRange(header: string | undefined, size: number): { start: number; end: number } | undefined {
  if (header === undefined) return undefined
  const matched = /^bytes=(\d*)-(\d*)$/u.exec(header)
  if (matched === null) return undefined
  const startText = matched[1]
  const endText = matched[2]
  if (startText === '' && endText === '') return undefined
  if (startText === '') {
    const length = Number(endText)
    if (!Number.isSafeInteger(length) || length <= 0) return undefined
    return { start: Math.max(size - length, 0), end: size - 1 }
  }
  const start = Number(startText)
  const end = endText === '' ? size - 1 : Number(endText)
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) return undefined
  return { start, end: Math.min(end, size - 1) }
}

/** One effect-scoped media authority. It never serves a raw path. */
export class ProductPreviewMediaServer {
  private readonly tokens = new Map<string, MediaToken>()
  private readonly maxFileBytes: number
  private readonly tokenTtlMs: number

  constructor(private readonly config: ProductPreviewMediaConfig, private readonly expectedHost: string) {
    this.maxFileBytes = config.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES
    this.tokenTtlMs = config.tokenTtlMs ?? DEFAULT_TOKEN_TTL_MS
  }

  private purge(now = Date.now()): void {
    for (const [id, token] of this.tokens) if (token.expiresAt <= now) this.tokens.delete(id)
    while (this.tokens.size >= MAX_MEDIA_TOKENS) this.tokens.delete(this.tokens.keys().next().value as string)
  }

  private async allowedPath(value: string): Promise<{ path: string; kind: ProductMediaKind; size: number } | undefined> {
    if (!isAbsolute(value) || value.includes('\0')) return undefined
    const kind = productMediaKind(value)
    if (kind === undefined) return undefined
    const [path, roots] = await Promise.all([
      realpath(value).catch(() => undefined),
      Promise.all(this.config.allowedRoots.map(root => realpath(root).catch(() => undefined))),
    ])
    if (path === undefined || !roots.some(root => root !== undefined && isWithinRoot(path, root))) return undefined
    const info = await stat(path).catch(() => undefined)
    if (info === undefined || !info.isFile() || info.size > this.maxFileBytes) return undefined
    return { path, kind, size: info.size }
  }

  /** Resolve a known local media path into a short-lived opaque browser URL. */
  async resolve(path: string, now = Date.now()): Promise<ResolvedProductMedia | undefined> {
    const allowed = await this.allowedPath(path)
    if (allowed === undefined) return undefined
    this.purge(now)
    const id = randomBytes(24).toString('base64url')
    const token: MediaToken = {
      id,
      kind: allowed.kind,
      mimeType: mediaMimeType(allowed.kind, allowed.path),
      size: allowed.size,
      url: `/api/product-preview/media/${id}`,
      path: allowed.path,
      expiresAt: now + this.tokenTtlMs,
    }
    this.tokens.set(id, token)
    return { id, kind: token.kind, mimeType: token.mimeType, size: token.size, url: token.url }
  }

  /** Check whether one path is an allowed local preview file without issuing a media URL. */
  async validate(path: string): Promise<boolean> {
    return await this.allowedPath(path) !== undefined
  }

  /** Handle an exact same-origin local-media availability request. */
  async handleValidate(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (request.method !== 'POST' || !requestOrigin(request, this.expectedHost)) return sendJson(response, 403, { error: 'forbidden' })
    try {
      const path = pathRequest(await readJson(request))
      if (path === undefined || !await this.validate(path)) return sendJson(response, 404, { error: 'media is unavailable' })
      sendJson(response, 200, { available: true })
    } catch {
      sendJson(response, 400, { error: 'invalid media request' })
    }
  }

  /** Handle the exact same-origin resolution request. */
  async handleResolve(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (request.method !== 'POST' || !requestOrigin(request, this.expectedHost)) return sendJson(response, 403, { error: 'forbidden' })
    try {
      const path = pathRequest(await readJson(request))
      const media = path === undefined ? undefined : await this.resolve(path)
      if (media === undefined) return sendJson(response, 404, { error: 'media is unavailable' })
      sendJson(response, 200, media)
    } catch {
      sendJson(response, 400, { error: 'invalid media request' })
    }
  }

  /** Stream one resolved media file with standard single-range support. */
  async handleMedia(request: IncomingMessage, response: ServerResponse, id: string): Promise<void> {
    if (request.method !== 'GET' || !requestOrigin(request, this.expectedHost)) return sendJson(response, 403, { error: 'forbidden' })
    if (!TOKEN_ID_PATTERN.test(id)) return sendJson(response, 404, { error: 'media is unavailable' })
    this.purge()
    const token = this.tokens.get(id)
    if (token === undefined) return sendJson(response, 404, { error: 'media is unavailable' })
    const range = singleRange(request.headers.range, token.size)
    if (request.headers.range !== undefined && range === undefined) {
      response.statusCode = 416
      response.setHeader('content-range', `bytes */${String(token.size)}`)
      response.end()
      return
    }
    const start = range?.start ?? 0
    const end = range?.end ?? token.size - 1
    response.statusCode = range === undefined ? 200 : 206
    response.setHeader('accept-ranges', 'bytes')
    response.setHeader('cache-control', 'no-store')
    response.setHeader('content-type', token.mimeType)
    response.setHeader('content-length', String(end - start + 1))
    response.setHeader('x-content-type-options', 'nosniff')
    if (range !== undefined) response.setHeader('content-range', `bytes ${String(start)}-${String(end)}/${String(token.size)}`)
    createReadStream(token.path, { start, end }).pipe(response)
  }
}
