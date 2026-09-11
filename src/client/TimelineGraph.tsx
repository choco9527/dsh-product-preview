/** Read-only conversation-order navigation; edges do not assert artifact provenance. */
import { useEffect, useMemo, type ReactNode } from 'react'
import {
  Background, Controls, Handle, MarkerType, PanOnScrollMode, Position, ReactFlow, useReactFlow, useStore,
  type Node, type NodeProps,
} from '@xyflow/react'
import flowCss from '@xyflow/react/dist/style.css?inline'

type TimelineData = { content: ReactNode; active: boolean; select: () => void }
type TimelineGraphNode = Node<TimelineData, 'timeline'>

const CARD_WIDTH = 190
const CARD_HEIGHT = 84
const CARD_PITCH = 108
const FOCUS_DURATION_MS = 240

/** Keep native buttons as the keyboard selection surface; graph movement stays disabled. */
export function TimelineGraphCard({ data }: Pick<NodeProps<TimelineGraphNode>, 'data'>) {
  return <><Handle type="target" position={Position.Top} />
    <button className="productPreviewGraphCard nodrag nopan" type="button" aria-current={data.active ? 'true' : undefined} onClick={event => { event.stopPropagation(); data.select() }}>{data.content}</button>
    <Handle type="source" position={Position.Bottom} /></>
}
const nodeTypes = { timeline: TimelineGraphCard }

/** Lay out recorded events in their supplied chronological order, without mutating them. */
export function timelineGraphLayout(ids: readonly string[]) {
  return {
    positions: ids.map((id, index) => ({ id, position: { x: 0, y: index * CARD_PITCH } })),
    edges: ids.slice(1).map((id, index) => ({ id: `order-${index}`, source: ids[index]!, target: id, style: { strokeDasharray: '4 4' }, markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 } })),
  }
}

/**
 * Center one laid-out card without reading the graph store, so focus reuses the
 * layout's own arithmetic instead of waiting for a measured node.
 * @param index - position of the card in the supplied chronological order.
 * @returns the graph coordinate at that card's center.
 */
export function timelineCardCenter(index: number) {
  return { x: CARD_WIDTH / 2, y: index * CARD_PITCH + CARD_HEIGHT / 2 }
}

/**
 * Decide where the viewport belongs, keeping the rule itself out of the effect.
 * Focus waits for a measured pane: centering against a zero-sized viewport
 * lands the card off screen and no later resize corrects it. Focus is also
 * declined once a reader has picked a card other than the newest, so arriving
 * artifacts stop stealing the view they are reading.
 * @param input - the current order, the reader's pick, and the measured pane.
 * @returns the coordinate to center, or undefined to leave the viewport alone.
 */
export function timelineFocusTarget({ ids, selected, measured }: {
  readonly ids: readonly string[]
  readonly selected: string | undefined
  readonly measured: boolean
}) {
  const newest = ids.at(-1)
  if (!measured || newest === undefined) return undefined
  if (selected !== undefined && selected !== newest) return undefined
  return timelineCardCenter(ids.length - 1)
}

/**
 * Bring the newest card into view whenever the graph grows. React Flow keeps
 * the viewport in its own store, so this rides its imperative face rather than
 * a controlled prop: a controlled viewport would fight the reader's own
 * panning. Mounted as a graph child because that is what puts it inside the
 * store the `ReactFlow` element provides.
 */
export function TimelineFollower({ ids, selected }: { readonly ids: readonly string[]; readonly selected: string | undefined }) {
  const { setCenter, getZoom } = useReactFlow()
  const measured = useStore(state => state.width > 0 && state.height > 0)
  const newest = ids.at(-1)
  // Depend on the decision inputs rather than the resolved coordinate: a fresh
  // object every render would re-center on every unrelated parent update.
  useEffect(() => {
    const target = timelineFocusTarget({ ids, selected, measured })
    if (target === undefined) return
    void setCenter(target.x, target.y, { zoom: getZoom(), duration: FOCUS_DURATION_MS })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ids enters through its length and newest member.
  }, [ids.length, newest, selected, measured, setCenter, getZoom])
  return null
}

/** Preserve file and preview selection outside the graph component. */
export default function TimelineGraph({ items, selected, select, label, zoomIn, zoomOut, fit }: {
  readonly items: readonly { readonly id: string; readonly content: ReactNode }[]
  readonly selected: string | undefined
  readonly select: (id: string) => void
  readonly label: string
  readonly zoomIn: string; readonly zoomOut: string; readonly fit: string
}) {
  const ids = useMemo(() => items.map(item => item.id), [items])
  const layout = useMemo(() => timelineGraphLayout(ids), [ids])
  const nodes: TimelineGraphNode[] = items.map((item, index) => ({
    ...layout.positions[index]!, type: 'timeline', width: CARD_WIDTH, height: CARD_HEIGHT,
    data: { content: item.content, active: selected === item.id, select: () => { select(item.id) } },
  }))
  return <nav className="productPreviewTimelineGraph" aria-label={label}>
    <style>{flowCss}</style><p className="productPreviewGraphHint">{label}</p>
    <div className="productPreviewGraphCanvas"><ReactFlow nodes={nodes} edges={layout.edges} nodeTypes={nodeTypes}
      defaultViewport={{ x: 16, y: 16, zoom: 1 }} minZoom={0.4} maxZoom={1.5}
      nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} nodesFocusable={false}
      edgesFocusable={false} deleteKeyCode={null} selectionKeyCode={null} multiSelectionKeyCode={null}
      onNodeClick={(_, node) => { node.data.select() }}
      zoomOnScroll={false} panOnScroll panOnScrollMode={PanOnScrollMode.Vertical}
      zoomOnDoubleClick={false} preventScrolling={false}
      ariaLabelConfig={{ 'controls.zoomIn.ariaLabel': zoomIn, 'controls.zoomOut.ariaLabel': zoomOut, 'controls.fitView.ariaLabel': fit }}>
      <Background gap={18} /><Controls showInteractive={false} />
      <TimelineFollower ids={ids} selected={selected} />
    </ReactFlow></div>
  </nav>
}
