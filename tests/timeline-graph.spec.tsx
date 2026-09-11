import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
const observed = vi.hoisted(() => ({
  props: {} as Record<string, unknown>,
  setCenter: vi.fn(),
  // Panes start unmeasured; each test opts in to the measured state it needs.
  measured: { width: 0, height: 0 },
}))
vi.mock('@xyflow/react', () => ({
  ReactFlow: (props: Record<string, unknown>) => { observed.props = props; return null },
  Handle: () => null, Controls: () => null, Background: () => null, Position: { Top: 'top', Bottom: 'bottom' },
  PanOnScrollMode: { Vertical: 'vertical' }, MarkerType: { ArrowClosed: 'arrowclosed' },
  useReactFlow: () => ({ setCenter: observed.setCenter, getZoom: () => 1 }),
  useStore: (selector: (state: typeof observed.measured) => unknown) => selector(observed.measured),
}))
import TimelineGraph, { TimelineGraphCard, timelineCardCenter, timelineFocusTarget, timelineGraphLayout } from '../src/client/TimelineGraph.tsx'

describe('read-only conversation graph', () => {
  it('preserves recorded IDs and event order without changing inputs', () => {
    const ids = Object.freeze(['late-id', 'early-id'])
    expect(timelineGraphLayout(ids).edges).toEqual([{ id: 'order-0', source: 'late-id', target: 'early-id', style: { strokeDasharray: '4 4' }, markerEnd: { type: 'arrowclosed', width: 14, height: 14 } }])
    expect(timelineGraphLayout([]).edges).toEqual([])
  })
  it('disables editing and delegates selection to the existing preview', () => {
    const select = vi.fn()
    renderToStaticMarkup(createElement(TimelineGraph, { items: [{ id: 'image', content: 'PNG' }, { id: 'svga', content: 'SVGA' }], selected: 'image', select, label: 'Order', zoomIn: '+', zoomOut: '-', fit: 'Fit' }))
    expect(observed.props).toMatchObject({ nodesDraggable: false, nodesConnectable: false, elementsSelectable: false, deleteKeyCode: null,
      zoomOnScroll: false, panOnScroll: true, panOnScrollMode: 'vertical' })
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

describe('newest-node focus', () => {
  const measured = true
  it('centers the newest card, and follows it as the order grows', () => {
    // The default (nothing picked) and an explicit pick of the newest card are
    // the same case: both keep following.
    expect(timelineFocusTarget({ ids: ['a', 'b'], selected: undefined, measured })).toEqual(timelineCardCenter(1))
    expect(timelineFocusTarget({ ids: ['a', 'b'], selected: 'b', measured })).toEqual(timelineCardCenter(1))
    expect(timelineFocusTarget({ ids: ['a', 'b', 'c'], selected: undefined, measured })).toEqual(timelineCardCenter(2))
  })

  it('leaves the viewport alone once an older card is picked', () => {
    expect(timelineFocusTarget({ ids: ['a', 'b', 'c'], selected: 'a', measured })).toBeUndefined()
  })

  it('waits for a measured pane and skips an empty order', () => {
    // Centering against a zero-sized pane lands the card off screen, and no
    // later resize re-runs the focus on its own.
    expect(timelineFocusTarget({ ids: ['a'], selected: undefined, measured: false })).toBeUndefined()
    expect(timelineFocusTarget({ ids: [], selected: undefined, measured })).toBeUndefined()
  })

  it('centers each card on the same pitch the layout positions it at', () => {
    const ids = ['a', 'b', 'c']
    const positions = timelineGraphLayout(ids).positions
    for (const [index] of ids.entries()) {
      expect(timelineCardCenter(index).y).toBeGreaterThan(positions[index]!.position.y)
      expect(timelineCardCenter(index).y).toBeLessThan(positions[index]!.position.y + 108)
    }
  })

  it('mounts the follower inside the graph, where the viewport store lives', () => {
    renderToStaticMarkup(createElement(TimelineGraph, {
      items: [{ id: 'one', content: 'PNG' }], selected: undefined, select: vi.fn(),
      label: 'Order', zoomIn: '+', zoomOut: '-', fit: 'Fit',
    }))
    // useReactFlow/useStore only resolve for descendants of the ReactFlow
    // element, so the follower has to be a child rather than a sibling.
    const children = observed.props.children as { type: unknown }[]
    expect(children.some(child => typeof child.type === 'function' && (child.type as { name: string }).name === 'TimelineFollower')).toBe(true)
  })
})
