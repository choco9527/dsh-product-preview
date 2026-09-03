/** Project successful conversation results into local previewable files. */

export type ProductMediaKind = 'image' | 'video' | 'svga'

/** One local file first reported by one durable conversation node. */
export interface ProductArtifact {
  readonly key: string
  readonly nodeId: string
  readonly nodeSeq: number
  readonly producer: string
  readonly localPath: string
  readonly kind: ProductMediaKind
  readonly title: string
}

/** Text settled by one successful tool or assistant node. */
export interface ProductToolResult {
  readonly callId: string
  readonly nodeSeq: number
  readonly toolName: string
  readonly output: string
  readonly isError: boolean
}

interface JsonRecord {
  readonly [key: string]: unknown
}

const IMAGE_EXTENSIONS = new Set(['gif', 'jpeg', 'jpg', 'png', 'webp'])
const VIDEO_EXTENSIONS = new Set(['m4v', 'mov', 'mp4', 'webm'])
const MEDIA_PATH_SUFFIX = String.raw`(?:gif|jpe?g|m4v|mov|mp4|png|svga|webm|webp)`
const LOCAL_MEDIA_PATH = new RegExp(
  String.raw`(?:^|[\s:：\x60"'（(])(?<path>/(?!/)[^\r\n]*?\.${MEDIA_PATH_SUFFIX})(?=$|[\s,，。;；)）\]】\x60"'])`,
  'giu',
)

function extension(path: string): string | undefined {
  const segment = path.split(/[\\/]/u).at(-1) ?? path
  const index = segment.lastIndexOf('.')
  return index < 0 ? undefined : segment.slice(index + 1).toLowerCase()
}

/** Classify only media formats that the preview surface can render. */
export function productMediaKind(path: string): ProductMediaKind | undefined {
  const value = extension(path)
  if (value === 'svga') return 'svga'
  if (value !== undefined && IMAGE_EXTENSIONS.has(value)) return 'image'
  if (value !== undefined && VIDEO_EXTENSIONS.has(value)) return 'video'
  return undefined
}

function title(path: string): string {
  return path.split(/[\\/]/u).at(-1) || path
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringsInJson(value: unknown): readonly string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(stringsInJson)
  if (!isRecord(value)) return []
  return Object.values(value).flatMap(stringsInJson)
}

function localPathsInText(value: string): readonly string[] {
  return [...value.matchAll(LOCAL_MEDIA_PATH)]
    .map(match => match.groups?.path)
    .filter((path): path is string => path !== undefined)
}

function localPaths(output: string): readonly string[] {
  try {
    return stringsInJson(JSON.parse(output)).flatMap(localPathsInText)
  } catch {
    return localPathsInText(output)
  }
}

/**
 * Read local media paths from every successful result and retain their first
 * reported conversation node. The Host validates paths again before serving.
 */
export function productArtifacts(results: readonly ProductToolResult[]): readonly ProductArtifact[] {
  const seen = new Set<string>()
  return results.flatMap(result => {
    if (result.isError) return []
    return localPaths(result.output).flatMap(localPath => {
      const kind = productMediaKind(localPath)
      if (kind === undefined || seen.has(localPath)) return []
      seen.add(localPath)
      return [{
        key: `${result.callId}:${localPath}`,
        nodeId: result.callId,
        nodeSeq: result.nodeSeq,
        producer: result.toolName,
        localPath,
        kind,
        title: title(localPath),
      }]
    })
  })
}
