import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
vi.mock('svga.lite', () => ({ Parser: class {}, Player: class {} }))
import { ProductPreviewView, fileTree } from '../src/client/ProductPreviewView.tsx'
import type { ProductArtifact } from '../src/artifacts.ts'

describe('ProductPreviewView', () => {
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
