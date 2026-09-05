/** Finder-style timeline, file-browser, and preview columns for one conversation. */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Parser, Player } from 'svga.lite'
import type { UseChat } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { productArtifacts, type ProductArtifact } from '../artifacts.ts'
import {
  invokeProductPreviewAction,
  resolveLocalMedia,
  validateLocalMedia,
  type ResolvedMedia,
} from './media.ts'
import { conversationProductResults } from './conversation-results.ts'
import { FileIcon } from './FileIcon.tsx'
import { useReturnToChat } from './submission-navigation.ts'

type Props = ConvViewProps & PropsLocale<'product-preview'> & { readonly useChat: UseChat }

interface TimelineNode {
  readonly id: string
  readonly seq: number
  readonly producer: string
  readonly artifacts: readonly ProductArtifact[]
}

interface FileTreeNode {
  readonly key: string
  readonly name: string
  readonly depth: number
  readonly artifact?: ProductArtifact
}

function timelineNodes(artifacts: readonly ProductArtifact[]): readonly TimelineNode[] {
  const nodes = new Map<string, TimelineNode>()
  for (const artifact of artifacts) {
    const existing = nodes.get(artifact.nodeId)
    nodes.set(artifact.nodeId, existing === undefined ? {
      id: artifact.nodeId,
      seq: artifact.nodeSeq,
      producer: artifact.producer,
      artifacts: [artifact],
    } : { ...existing, artifacts: [...existing.artifacts, artifact] })
  }
  return [...nodes.values()].sort((left, right) => left.seq - right.seq || left.id.localeCompare(right.id))
}

function pathParts(path: string): readonly string[] {
  return path.split(/[\\/]/u).filter(Boolean)
}

function commonDirectory(artifacts: readonly ProductArtifact[]): readonly string[] {
  const directories = artifacts.map(artifact => pathParts(artifact.localPath).slice(0, -1))
  const first = directories.at(0) ?? []
  const mismatch = first.findIndex((part, index) => !directories.every(directory => directory[index] === part))
  return mismatch === -1 ? first : first.slice(0, mismatch)
}

/** Keep each directory adjacent to its children, preserving original path segments. */
export function fileTree(artifacts: readonly ProductArtifact[]): readonly FileTreeNode[] {
  const root = commonDirectory(artifacts)
  const directories = new Map<string, { name: string; depth: number }>()
  const files: FileTreeNode[] = []
  for (const artifact of artifacts) {
    const parts = pathParts(artifact.localPath)
    const relative = parts.slice(root.length)
    const parents = relative.slice(0, -1)
    for (let index = 0; index < parents.length; index += 1) {
      const names = parents.slice(0, index + 1)
      const key = names.join('/')
      if (!directories.has(key)) directories.set(key, { name: names.at(-1) ?? key, depth: index })
    }
    files.push({ key: artifact.key, name: relative.at(-1) ?? artifact.title, depth: parents.length, artifact })
  }
  const directoryNodes: readonly FileTreeNode[] = [...directories.entries()].map(([key, value]) => ({
    key: `directory:${key}`,
    name: value.name,
    depth: value.depth,
  }))
  return [...directoryNodes, ...files].sort((left, right) => {
    const a = left.artifact === undefined ? left.key.slice('directory:'.length).split('/') : pathParts(left.artifact.localPath).slice(root.length)
    const b = right.artifact === undefined ? right.key.slice('directory:'.length).split('/') : pathParts(right.artifact.localPath).slice(root.length)
    for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
      if (a[index] === b[index]) continue
      const aFolder = index < a.length - 1 || left.artifact === undefined
      const bFolder = index < b.length - 1 || right.artifact === undefined
      if (aFolder !== bFolder) return aFolder ? -1 : 1
      return (a[index] ?? '').localeCompare(b[index] ?? '', undefined, { numeric: true })
    }
    return a.length - b.length
  })
}

function useResolvedMedia(artifact: ProductArtifact | undefined): ResolvedMedia | undefined {
  const [media, setMedia] = useState<ResolvedMedia>()
  useEffect(() => {
    let current = true
    setMedia(undefined)
    if (artifact === undefined) return
    void resolveLocalMedia(artifact.localPath).then(value => {
      if (current) setMedia(value)
    }).catch(() => {
      if (current) setMedia(undefined)
    })
    return () => { current = false }
  }, [artifact?.key, artifact?.localPath])
  return media
}

function artifactSignature(artifacts: readonly ProductArtifact[]): string {
  return artifacts.map(artifact => artifact.key).join('\u0000')
}

function useAvailableArtifacts(candidates: readonly ProductArtifact[]): {
  readonly artifacts: readonly ProductArtifact[]
  readonly pending: boolean
} {
  const signature = artifactSignature(candidates)
  const [state, setState] = useState<{ readonly signature: string; readonly artifacts: readonly ProductArtifact[] }>()
  useEffect(() => {
    let current = true
    void Promise.all(candidates.map(async artifact => await validateLocalMedia(artifact.localPath) ? artifact : undefined)).then(result => {
      if (current) setState({ signature, artifacts: result.filter((artifact): artifact is ProductArtifact => artifact !== undefined) })
    }).catch(() => {
      if (current) setState({ signature, artifacts: [] })
    })
    return () => { current = false }
  }, [candidates, signature])
  if (state?.signature !== signature) return { artifacts: [], pending: candidates.length > 0 }
  return { artifacts: state.artifacts, pending: false }
}

function SvgaPreview({ url, t }: { readonly url: string; readonly t: Props['t'] }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  useEffect(() => {
    let disposed = false
    let player: Player | undefined
    let parser: Parser | undefined
    const abort = new AbortController()
    setState('loading')
    void (async () => {
      const response = await fetch(url, { signal: abort.signal })
      if (!response.ok) throw new Error('SVGA media request failed')
      const bytes = await response.arrayBuffer()
      if (disposed) return
      parser = new Parser({ disableWorker: true })
      const item = await parser.do(bytes)
      if (disposed || canvas.current === null) return
      player = new Player(canvas.current)
      await player.mount(item)
      if (!disposed) { player.start(); setState('ready') }
    })().catch(() => { if (!disposed) setState('failed') })
    return () => {
      disposed = true
      abort.abort()
      player?.destroy()
      parser?.destroy()
    }
  }, [url])
  return <><canvas ref={canvas} style={{ display: state === 'ready' ? 'block' : 'none' }} />{state !== 'ready' && <p role="status">{t(state === 'loading' ? 'loading' : 'svgaFailed')}</p>}</>
}

function MediaCanvas({ artifact, media, t }: {
  readonly artifact: ProductArtifact
  readonly media: ResolvedMedia | undefined
  readonly t: Props['t']
}) {
  const url = media?.url
  if (artifact.kind === 'image') return url === undefined ? <p>{t('unavailable')}</p> : <img alt={t('imageAlt')} src={url} />
  if (artifact.kind === 'video') return url === undefined ? <p>{t('unavailable')}</p> : <video controls preload="metadata" src={url}>{t('unsupported')}</video>
  return url === undefined ? <p role="status">{t('loading')}</p> : <SvgaPreview key={url} t={t} url={url} />
}

function TimelineColumn({ nodes, selected, select, t }: {
  readonly nodes: readonly TimelineNode[]
  readonly selected: string | undefined
  readonly select: (id: string) => void
  readonly t: Props['t']
}) {
  return <nav aria-label={t('timeline')} className="productPreviewColumn productPreviewTimeline">
    {nodes.map(node => <button aria-current={selected === node.id ? 'true' : undefined} className="productPreviewRow" key={node.id} onClick={() => { select(node.id) }} title={commonDirectory(node.artifacts).at(-1) ?? node.artifacts[0]?.title} type="button">
      <span className="productPreviewNodeIcon" aria-hidden="true" />
      <span className="productPreviewRowText"><strong>{commonDirectory(node.artifacts).at(-1) ?? node.artifacts[0]?.title ?? t('node')}</strong><span>{`#${String(node.seq)} · ${String(node.artifacts.length)} ${t('files')}`}</span></span>
    </button>)}
  </nav>
}

function FileColumn({ artifacts, selected, select, t }: {
  readonly artifacts: readonly ProductArtifact[]
  readonly selected: string | undefined
  readonly select: (artifact: ProductArtifact) => void
  readonly t: Props['t']
}) {
  const tree = useMemo(() => fileTree(artifacts), [artifacts])
  const directory = commonDirectory(artifacts).at(-1)
  if (tree.length === 0) return <section className="productPreviewColumn productPreviewEmpty">{t('chooseNode')}</section>
  return <nav aria-label={t('files')} className="productPreviewColumn productPreviewFiles">
    {directory && <div className="productPreviewRoot" title={commonDirectory(artifacts).join('/')}><FileIcon kind="folder" /><span>{directory}</span></div>}
    {tree.map(item => item.artifact === undefined
      ? <div className="productPreviewDirectory" key={item.key} style={{ paddingInlineStart: `${String(10 + item.depth * 14)}px` }}><FileIcon kind="folder" /><span>{item.name}</span></div>
      : <button aria-current={selected === item.artifact.key ? 'true' : undefined} className="productPreviewFile" key={item.key} onClick={() => { select(item.artifact as ProductArtifact) }} onContextMenu={event => {
        event.preventDefault()
        void invokeProductPreviewAction(item.artifact?.localPath ?? '', 'context-menu')
      }} style={{ paddingInlineStart: `${String(10 + item.depth * 14)}px` }} title={item.name} type="button"><FileIcon kind={item.artifact.kind} /><span>{item.name}</span></button>) }
  </nav>
}

function DetailColumn({ artifact, t }: { readonly artifact: ProductArtifact | undefined; readonly t: Props['t'] }) {
  const media = useResolvedMedia(artifact)
  if (artifact === undefined) return <section className="productPreviewDetail productPreviewEmpty">{t('chooseFile')}</section>
  return <article className="productPreviewDetail" onContextMenu={event => {
    event.preventDefault()
    void invokeProductPreviewAction(artifact.localPath, 'context-menu')
  }}>
    <div className="productPreviewCanvas"><MediaCanvas artifact={artifact} media={media} t={t} /></div>
    <h3 title={artifact.title}>{artifact.title}</h3>
    <p className="productPreviewSummary">{artifact.title.split('.').at(-1)?.toUpperCase()}{media === undefined ? '' : ` · ${media.size < 1024 * 1024 ? `${(media.size / 1024).toFixed(1)} KB` : `${(media.size / 1024 / 1024).toFixed(1)} MB`}`}</p>
    <div className="productPreviewActions"><button onClick={() => { void invokeProductPreviewAction(artifact.localPath, 'reveal') }} type="button"><FileIcon kind="folder" />{t('reveal')}</button></div>
    <details className="productPreviewInfo"><summary>{t('details')}</summary><dl className="productPreviewMetadata">
      <div><dt>{t('file')}</dt><dd>{artifact.localPath}</dd></div>
      <div><dt>{t('source')}</dt><dd>{artifact.producer}</dd></div>
    </dl></details>
  </article>
}

/** Render only artifact-bearing timeline nodes with their original paths and names. */
export function ProductPreviewView({ useChat, useSession, openView, t }: Props) {
  const conversationNodes = useChat(snapshot => snapshot.legacy.nodes)
  useReturnToChat({ useSession, openView }, conversationNodes)
  const candidates = useMemo(
    () => productArtifacts(conversationProductResults(conversationNodes)),
    [conversationNodes],
  )
  const availability = useAvailableArtifacts(candidates)
  const artifacts = availability.artifacts
  const nodes = useMemo(() => timelineNodes(artifacts), [artifacts])
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const selectedNode = nodes.find(node => node.id === selectedNodeId) ?? nodes.at(0)
  const [selectedKey, setSelectedKey] = useState<string>()
  const selected = selectedNode?.artifacts.find(artifact => artifact.key === selectedKey) ?? selectedNode?.artifacts.at(0)
  useEffect(() => {
    if (selectedNode !== undefined && selectedNode.id !== selectedNodeId) setSelectedNodeId(selectedNode.id)
  }, [selectedNode, selectedNodeId])
  useEffect(() => {
    if (selected !== undefined && selected.key !== selectedKey) setSelectedKey(selected.key)
  }, [selected, selectedKey])
  if (availability.pending) return <section className="productPreviewView productPreviewEmpty">{t('scanning')}</section>
  if (nodes.length === 0) return <section className="productPreviewView productPreviewEmpty">{t('noArtifact')}</section>
  return <section aria-label={t('title')} className="productPreviewView">
    <div className="productPreviewColumns">
      <TimelineColumn nodes={nodes} selected={selectedNode?.id} select={id => { setSelectedNodeId(id); setSelectedKey(undefined) }} t={t} />
      <FileColumn artifacts={selectedNode?.artifacts ?? []} selected={selected?.key} select={artifact => { setSelectedKey(artifact.key) }} t={t} />
      <DetailColumn artifact={selected} t={t} />
    </div>
  </section>
}
