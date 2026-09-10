/** Read-only conversation-order navigation; edges do not assert artifact provenance. */
import { useMemo, type ReactNode } from 'react'
import { Background, Controls, Handle, PanOnScrollMode, Position, ReactFlow, type Node, type NodeProps } from '@xyflow/react'
import flowCss from '@xyflow/react/dist/style.css?inline'

type TimelineData = { content: ReactNode; active: boolean; select: () => void }
type TimelineGraphNode = Node<TimelineData, 'timeline'>

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
    positions: ids.map((id, index) => ({ id, position: { x: 0, y: index * 108 } })),
    edges: ids.slice(1).map((id, index) => ({ id: `order-${index}`, source: ids[index]!, target: id, style: { strokeDasharray: '4 4' } })),
  }
}

/** Preserve file and preview selection outside the graph component. */
export default function TimelineGraph({ items, selected, select, label, zoomIn, zoomOut, fit }: {
  readonly items: readonly { readonly id: string; readonly content: ReactNode }[]
  readonly selected: string | undefined
  readonly select: (id: string) => void
  readonly label: string
  readonly zoomIn: string; readonly zoomOut: string; readonly fit: string
}) {
  const layout = useMemo(() => timelineGraphLayout(items.map(item => item.id)), [items])
  const nodes: TimelineGraphNode[] = items.map((item, index) => ({
    ...layout.positions[index]!, type: 'timeline', width: 190, height: 84,
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
    </ReactFlow></div>
  </nav>
}
