import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
const observed = vi.hoisted(() => ({ props: {} as Record<string, unknown> }))
vi.mock('@xyflow/react', () => ({
  ReactFlow: (props: Record<string, unknown>) => { observed.props = props; return null },
  Handle: () => null, Controls: () => null, Background: () => null, Position: { Top: 'top', Bottom: 'bottom' },
}))
import TimelineGraph, { TimelineGraphCard, timelineGraphLayout } from '../src/client/TimelineGraph.tsx'

describe('read-only conversation graph', () => {
  it('preserves recorded IDs and event order without changing inputs', () => {
    const ids = Object.freeze(['late-id', 'early-id'])
    expect(timelineGraphLayout(ids).edges).toEqual([{ id: 'order-0', source: 'late-id', target: 'early-id', style: { strokeDasharray: '4 4' } }])
    expect(timelineGraphLayout([]).edges).toEqual([])
  })
  it('disables editing and delegates selection to the existing preview', () => {
    const select = vi.fn()
    renderToStaticMarkup(createElement(TimelineGraph, { items: [{ id: 'image', content: 'PNG' }, { id: 'svga', content: 'SVGA' }], selected: 'image', select, label: 'Order', zoomIn: '+', zoomOut: '-', fit: 'Fit' }))
    expect(observed.props).toMatchObject({ nodesDraggable: false, nodesConnectable: false, elementsSelectable: false, deleteKeyCode: null })
    const nodes = observed.props.nodes as { data: Parameters<typeof TimelineGraphCard>[0]['data'] }[]
    ;(observed.props.onNodeClick as (_: unknown, node: typeof nodes[number]) => void)(undefined, nodes[1]!)
    expect(select).toHaveBeenCalledWith('svga')
    const card = TimelineGraphCard({ data: nodes[1]!.data })
    card.props.children[1].props.onClick({ stopPropagation: vi.fn() })
    expect(select).toHaveBeenCalledTimes(2)
    const markup = renderToStaticMarkup(card)
    expect(markup).toContain('SVGA')
    // nodrag alone still lets the pane treat a press as a pan and swallow the
    // click; nopan is what keeps the button reachable as a selection surface.
    expect(markup).toContain('nopan')
  })
})
