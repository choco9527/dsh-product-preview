/** DSH Host plugin for secure local artifact preview routes. */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { ProductPreviewMediaServer } from './media-server.ts'

export { productArtifacts, productMediaKind, type ProductArtifact, type ProductMediaKind, type ProductToolResult } from './artifacts.ts'
export { ProductPreviewMediaServer, type ProductPreviewMediaConfig, type ResolvedProductMedia } from './media-server.ts'

export const name = 'product-preview'
export const inject = ['webServer']

export interface Config {
  allowedRoots: string[]
  readonly maxFileBytes: number
  readonly tokenTtlMs: number
}

export const Config: z<Config> = z.object({
  allowedRoots: z.array(String).default([]),
  maxFileBytes: z.natural().min(1).default(200 * 1024 * 1024),
  tokenTtlMs: z.natural().min(1_000).default(5 * 60 * 1_000),
})

/** Register same-origin resolution and streaming routes for this DSH generation. */
export function apply(ctx: Context, config: Config): void {
  const expectedHost = `${ctx.webServer.host}:${String(ctx.webServer.port)}`
  const media = new ProductPreviewMediaServer(config, expectedHost)
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/product-preview/validate',
    handler: (request, response) => media.handleValidate(request, response),
  }), 'product-preview: media validation route')
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/product-preview/resolve',
    handler: (request, response) => media.handleResolve(request, response),
  }), 'product-preview: media resolution route')
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/api/product-preview/media',
    handler: (request, response) => {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
      const id = pathname.startsWith('/api/product-preview/media/')
        ? pathname.slice('/api/product-preview/media/'.length)
        : ''
      return media.handleMedia(request, response, id)
    },
  }), 'product-preview: media stream route')
}
