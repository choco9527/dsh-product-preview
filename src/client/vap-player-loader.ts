/** Normalize the package's CJS default export across native import and bundled interop. */
type Factory = typeof import('video-animation-player').default

export function vapFactory(value: unknown): Factory {
  if (typeof value === 'function') return value as Factory
  if (typeof value === 'object' && value !== null && 'default' in value && typeof value.default === 'function') return value.default as Factory
  throw new Error('VAP player export unavailable')
}

/** Load the bundled player only after a local VAP source has been validated. */
export async function loadVapFactory(): Promise<Factory> {
  const module = await import('video-animation-player')
  return vapFactory(module.default)
}
