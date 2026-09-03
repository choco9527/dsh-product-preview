import { createServer } from 'node:http'
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ProductPreviewMediaServer } from '../src/media-server.ts'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function temporaryDirectory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'dsh-product-preview-'))
  temporaryDirectories.push(path)
  return path
}

async function startMediaServer(createMedia: (host: string) => ProductPreviewMediaServer) {
  let media: ProductPreviewMediaServer | undefined
  const server = createServer((request, response) => {
    if (media === undefined) throw new Error('media server was not initialized')
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
    if (pathname === '/api/product-preview/validate') {
      void media.handleValidate(request, response)
      return
    }
    if (pathname === '/api/product-preview/resolve') {
      void media.handleResolve(request, response)
      return
    }
    void media.handleMedia(request, response, pathname.slice('/api/product-preview/media/'.length))
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve() })
  })
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('test server did not expose a TCP address')
  const origin = `http://127.0.0.1:${String(address.port)}`
  media = createMedia(`127.0.0.1:${String(address.port)}`)
  return {
    origin,
    media,
    close: async () => await new Promise<void>((resolve, reject) => server.close(error => error === undefined ? resolve() : reject(error))),
  }
}

function sameOriginHeaders(origin: string): HeadersInit {
  return { origin, 'sec-fetch-site': 'same-origin' }
}

describe('ProductPreviewMediaServer', () => {
  it('refuses a symlink that escapes the configured delivery root', async () => {
    const root = await temporaryDirectory()
    const outside = await temporaryDirectory()
    const allowed = join(root, 'artifact.png')
    const escaped = join(root, 'escaped.png')
    await writeFile(allowed, 'allowed')
    await writeFile(join(outside, 'secret.png'), 'secret')
    await symlink(join(outside, 'secret.png'), escaped)
    const media = new ProductPreviewMediaServer({ allowedRoots: [root] }, '127.0.0.1:1')
    expect(await media.resolve(allowed)).toMatchObject({ kind: 'image', size: 7 })
    await expect(media.resolve(escaped)).resolves.toBeUndefined()
  })

  it('streams an opaque same-origin URL and honors one byte range', async () => {
    const root = await temporaryDirectory()
    const file = join(root, '静态图-01.png')
    await writeFile(file, 'abcdefghij')
    const started = await startMediaServer(host => new ProductPreviewMediaServer({ allowedRoots: [root] }, host))
    try {
      const resolved = await fetch(`${started.origin}/api/product-preview/resolve`, {
        method: 'POST',
        headers: { ...sameOriginHeaders(started.origin), 'content-type': 'application/json' },
        body: JSON.stringify({ path: file }),
      })
      expect(resolved.status).toBe(200)
      const value = await resolved.json() as { url: string }
      const response = await fetch(`${started.origin}${value.url}`, {
        headers: { ...sameOriginHeaders(started.origin), range: 'bytes=2-5' },
      })
      expect(response.status).toBe(206)
      expect(response.headers.get('content-range')).toBe('bytes 2-5/10')
      await expect(response.text()).resolves.toBe('cdef')
    } finally {
      await started.close()
    }
  })

  it('validates an allowed existing file without creating a media URL', async () => {
    const root = await temporaryDirectory()
    const file = join(root, 'artifact.png')
    await writeFile(file, 'data')
    const started = await startMediaServer(host => new ProductPreviewMediaServer({ allowedRoots: [root] }, host))
    try {
      const response = await fetch(`${started.origin}/api/product-preview/validate`, {
        method: 'POST',
        headers: { ...sameOriginHeaders(started.origin), 'content-type': 'application/json' },
        body: JSON.stringify({ path: file }),
      })
      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ available: true })
    } finally {
      await started.close()
    }
  })

  it('expires media URLs instead of retaining a permanent file route', async () => {
    const root = await temporaryDirectory()
    const file = join(root, 'artifact.png')
    await writeFile(file, 'data')
    const started = await startMediaServer(host => new ProductPreviewMediaServer({ allowedRoots: [root], tokenTtlMs: 1_000 }, host))
    try {
      const resolved = await started.media.resolve(file, 0)
      expect(resolved).toBeDefined()
      const response = await fetch(`${started.origin}${resolved?.url}`, { headers: sameOriginHeaders(started.origin) })
      expect(response.status).toBe(404)
    } finally {
      await started.close()
    }
  })
})
