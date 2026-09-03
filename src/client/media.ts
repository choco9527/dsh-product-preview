/** Browser client for the artifact preview Host media API. */

import type { ProductMediaKind } from '../artifacts.ts'

export interface ResolvedMedia {
  readonly id: string
  readonly kind: ProductMediaKind
  readonly mimeType: string
  readonly size: number
  readonly url: string
}

export type ProductPreviewAction = 'context-menu' | 'open' | 'reveal'

function isResolvedMedia(value: unknown): value is ResolvedMedia {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return typeof record.id === 'string'
    && (record.kind === 'image' || record.kind === 'video' || record.kind === 'svga')
    && typeof record.mimeType === 'string'
    && typeof record.size === 'number'
    && typeof record.url === 'string'
}

/** Confirm that one discovered path is a readable file within the configured roots. */
export async function validateLocalMedia(path: string, request: typeof fetch = fetch): Promise<boolean> {
  const response = await request('/api/product-preview/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  return response.ok
}

/** Resolve one timeline-local path to an opaque same-origin media URL. */
export async function resolveLocalMedia(path: string, request: typeof fetch = fetch): Promise<ResolvedMedia | undefined> {
  const response = await request('/api/product-preview/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  if (!response.ok) return undefined
  const value: unknown = await response.json()
  return isResolvedMedia(value) ? value : undefined
}

/** Request one optional Desktop-native action for a route-validated artifact. */
export async function invokeProductPreviewAction(
  path: string,
  action: ProductPreviewAction,
  request: typeof fetch = fetch,
): Promise<boolean> {
  const response = await request('/api/product-preview/actions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, path }),
  })
  return response.ok
}
