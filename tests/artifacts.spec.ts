import { describe, expect, it } from 'vitest'
import { productArtifacts, productMediaKind } from '../src/artifacts.ts'

describe('product artifact projection', () => {
  it('classifies media only by its terminal path extension', () => {
    expect(productMediaKind('/delivery/a.png')).toBe('image')
    expect(productMediaKind('/delivery/a.MP4')).toBe('video')
    expect(productMediaKind('/delivery/a.svga')).toBe('svga')
    expect(productMediaKind('/delivery/a.txt')).toBeUndefined()
  })

  it('discovers local paths recursively from every successful producer and retains the first node', () => {
    const output = JSON.stringify({
      job: {
        status: 'succeeded',
        output: '/outputs/campaign/first.png',
        files: ['/outputs/campaign/animation.svga'],
      },
    })
    expect(productArtifacts([
      { callId: 'first', nodeSeq: 11, toolName: 'image_generator', output, isError: false },
      { callId: 'repeat', nodeSeq: 20, toolName: 'poll_result', output: '/outputs/campaign/first.png', isError: false },
      { callId: 'failure', nodeSeq: 21, toolName: 'other_generator', output: '/outputs/campaign/failed.mp4', isError: true },
    ])).toEqual([
      expect.objectContaining({ nodeId: 'first', nodeSeq: 11, kind: 'image', localPath: '/outputs/campaign/first.png' }),
      expect.objectContaining({ nodeId: 'first', nodeSeq: 11, kind: 'svga', localPath: '/outputs/campaign/animation.svga' }),
    ])
  })

  it('discovers a local media path in arbitrary assistant prose without product-specific markers', () => {
    const path = '/Users/alex/Output/素材/静态图-01.png'
    expect(productArtifacts([{
      callId: 'assistant-42',
      nodeSeq: 42,
      toolName: 'assistant_text',
      output: `Created the file at \`${path}\`.`,
      isError: false,
    }])).toEqual([expect.objectContaining({
      key: `assistant-42:${path}`,
      nodeId: 'assistant-42',
      kind: 'image',
      localPath: path,
    })])
  })

  it('does not turn remote URLs or unsupported local files into Finder entries', () => {
    expect(productArtifacts([{
      callId: 'mixed',
      nodeSeq: 7,
      toolName: 'generic_tool',
      output: 'https://cdn.example.test/image.png /outputs/readme.txt',
      isError: false,
    }])).toEqual([])
  })
})
