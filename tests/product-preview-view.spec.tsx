import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
vi.mock('svga.lite', () => ({ Parser: class {}, Player: class {} }))
import { ProductPreviewView, TimelineColumn, fileTree, timelineNodes } from '../src/client/ProductPreviewView.tsx'
import type { ProductArtifact } from '../src/artifacts.ts'

describe('ProductPreviewView', () => {
  const artifact: ProductArtifact = { localPath: '/output/ring.png', key: 'ring', kind: 'image', title: 'ring.png', nodeId: 'one', nodeSeq: 388, producer: 'test' }
  const renderTimeline = (time: number | undefined, selected?: string) => renderToStaticMarkup(<TimelineColumn
    nodes={timelineNodes([{ ...artifact, ...(time === undefined ? {} : { nodeTime: time }) }])}
    selected={selected} select={() => {}} t={((key: string) => key) as never}
  />)

  it.each([undefined, 'one'])('shows local node time and separates the sequence styling when selected=%s', selected => {
    const date = new Date(2026, 8, 8, 18, 4)
    const markup = renderTimeline(date.getTime(), selected)
    expect(markup).toContain('class="productPreviewNodeSequence">#388</span> · 1 files')
    expect(markup).toContain(`dateTime="${date.toISOString()}"`)
    expect(markup).toContain('>09-08 18:04</time>')
    expect(markup).toContain('title="' + date.toLocaleString() + '"')
    expect(markup.includes('aria-current="true"')).toBe(selected === 'one')
  })

  it.each([undefined, NaN, Infinity])('omits unavailable node time (%s) without fabricating a date', time => {
    const markup = renderTimeline(time)
    expect(markup).not.toContain('<time')
    expect(markup).toContain('#388')
  })

  it('keeps an untimed timeline node without an explicit time field', () => {
    expect(timelineNodes([artifact])[0]).not.toHaveProperty('time')
  })

  it('keeps nested files below their own directory and uses only the common prefix', () => {
    const paths = ['/output/one/shared/a.png', '/output/two/shared/b.png', '/output/root.png']
    const artifacts: ProductArtifact[] = paths.map(localPath => ({ localPath, key: localPath, kind: 'image', title: localPath.split('/').at(-1)!, nodeId: 'one', nodeSeq: 1, producer: 'test' }))
    expect(fileTree(artifacts).map(item => [item.name, item.depth])).toEqual([
      ['one', 0], ['shared', 1], ['a.png', 2], ['two', 0], ['shared', 1], ['b.png', 2], ['root.png', 0],
    ])
  })
  it('renders from the Chat projection without a Trajectory view provider', () => {
    const markup = renderToStaticMarkup(<ProductPreviewView {...({
      useChat: (selector: (snapshot: unknown) => unknown) => selector({
        legacy: { nodes: [] },
      }),
      t: (key: string) => key,
      useSession: (selector: (snapshot: unknown) => unknown) => selector({ openState: 'open', sessionId: 'test', queue: [] }),
      openView: () => {},
    } as never)} />)

    expect(markup).toContain('noArtifact')
  })
})
