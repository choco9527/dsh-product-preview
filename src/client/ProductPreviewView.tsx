/** Finder-style timeline, file-browser, and preview columns for one conversation. */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { productArtifacts, type ProductArtifact } from '../artifacts.ts'
import {
  invokeProductPreviewAction,
  resolveLocalMedia,
  validateLocalMedia,
  type ResolvedMedia,
} from './media.ts'
import { trajectoryProductResults } from './trajectory-results.ts'

type Props = ConvViewProps & PropsLocale<'product-preview'>

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

interface SvgaPlayer {
  mount(item: unknown): Promise<undefined>
  start(): void
  destroy(): void
}

interface SvgaApi {
  Parser: new () => { do(data: ArrayBuffer): Promise<unknown> }
  Player: new (canvas: HTMLCanvasElement) => SvgaPlayer
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
  return first.filter((part, index) => directories.every(directory => directory[index] === part))
}

function fileTree(artifacts: readonly ProductArtifact[]): readonly FileTreeNode[] {
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
    const leftDirectory = left.artifact === undefined
    const rightDirectory = right.artifact === undefined
    if (leftDirectory !== rightDirectory) return leftDirectory ? -1 : 1
    return left.key.localeCompare(right.key, undefined, { numeric: true })
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

function SvgaPreview({ url, unsupported }: { readonly url: string | undefined; readonly unsupported: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let disposed = false
    let player: SvgaPlayer | undefined
    setFailed(false)
    if (url === undefined || canvas.current === null) return
    void import('svga.lite').then(module => {
      const api = (module.default ?? module) as unknown as SvgaApi
      if (disposed || typeof api.Parser !== 'function' || typeof api.Player !== 'function' || canvas.current === null) {
        if (!disposed) setFailed(true)
        return
      }
      void fetch(url).then(async response => {
        if (!response.ok) throw new Error('SVGA media request failed')
        return await new api.Parser().do(await response.arrayBuffer())
      }).then(async item => {
        if (disposed || canvas.current === null) return
        player = new api.Player(canvas.current)
        await player.mount(item)
        if (!disposed) player.start()
      }).catch(() => { if (!disposed) setFailed(true) })
    }).catch(() => { if (!disposed) setFailed(true) })
    return () => {
      disposed = true
      player?.destroy()
    }
  }, [url])
  return failed || url === undefined ? <p>{unsupported}</p> : <canvas ref={canvas} />
}

function MediaCanvas({ artifact, media, t }: {
  readonly artifact: ProductArtifact
  readonly media: ResolvedMedia | undefined
  readonly t: Props['t']
}) {
  const url = media?.url
  if (artifact.kind === 'image') return url === undefined ? <p>{t('unavailable')}</p> : <img alt={t('imageAlt')} src={url} />
  if (artifact.kind === 'video') return url === undefined ? <p>{t('unavailable')}</p> : <video controls preload="metadata" src={url}>{t('unsupported')}</video>
  return <SvgaPreview unsupported={t('unsupported')} url={url} />
}

function TimelineColumn({ nodes, selected, select, t }: {
  readonly nodes: readonly TimelineNode[]
  readonly selected: string | undefined
  readonly select: (id: string) => void
  readonly t: Props['t']
}) {
  return <nav aria-label={t('timeline')} className="productPreviewColumn productPreviewTimeline">
    {nodes.map(node => <button aria-current={selected === node.id ? 'true' : undefined} className="productPreviewRow" key={node.id} onClick={() => { select(node.id) }} type="button">
      <span className="productPreviewNodeIcon">●</span>
      <span className="productPreviewRowText"><strong>{`${t('node')} #${String(node.seq)}`}</strong><span>{`${String(node.artifacts.length)} ${t('files')}`}</span></span>
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
  if (tree.length === 0) return <section className="productPreviewColumn productPreviewEmpty">{t('chooseNode')}</section>
  return <nav aria-label={t('files')} className="productPreviewColumn productPreviewFiles">
    {tree.map(item => item.artifact === undefined
      ? <div className="productPreviewDirectory" key={item.key} style={{ paddingInlineStart: `${String(12 + item.depth * 16)}px` }}>{`▸ ${item.name}`}</div>
      : <button aria-current={selected === item.artifact.key ? 'true' : undefined} className="productPreviewFile" key={item.key} onClick={() => { select(item.artifact as ProductArtifact) }} onContextMenu={event => {
        event.preventDefault()
        void invokeProductPreviewAction(item.artifact?.localPath ?? '', 'context-menu')
      }} style={{ paddingInlineStart: `${String(12 + item.depth * 16)}px` }} type="button">{item.name}</button>) }
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
    <h3>{artifact.title}</h3>
    <dl className="productPreviewMetadata">
      <div><dt>{t('file')}</dt><dd>{artifact.localPath}</dd></div>
      <div><dt>{t('source')}</dt><dd>{artifact.producer}</dd></div>
    </dl>
    <div className="productPreviewActions"><button onClick={() => { void invokeProductPreviewAction(artifact.localPath, 'reveal') }} type="button">{t('reveal')}</button></div>
  </article>
}

/** Render only artifact-bearing timeline nodes with their original paths and names. */
export function ProductPreviewView({ useTrajectory, t }: Props) {
  const trajectory = useTrajectory(snapshot => snapshot)
  const candidates = useMemo(() => productArtifacts(trajectoryProductResults(trajectory)), [trajectory])
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
