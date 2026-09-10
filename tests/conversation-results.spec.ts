import { describe, expect, it } from 'vitest'
import { conversationProductResults } from '../src/client/conversation-results.ts'

describe('conversationProductResults', () => {
  it('keeps an assistant-delivered media path and its timeline sequence', () => {
    const results = conversationProductResults([{
      kind: 'assistant',
      seq: 42,
      time: 1700000042000,
      blocks: [{ kind: 'text', text: 'Saved /Users/alex/Output/静态图-01.png' }],
    }] as never)

    expect(results).toEqual([{
      callId: 'assistant-42',
      nodeSeq: 42,
      nodeTime: 1700000042000,
      toolName: 'assistant_text',
      output: 'Saved /Users/alex/Output/静态图-01.png',
      isError: false,
    }])
  })

  it('retains an unpaired successful result because a history window can omit its call head', () => {
    const results = conversationProductResults([{
      kind: 'tool-result',
      seq: 17,
      time: 1700000017000,
      callId: 'delivery-result',
      call: null,
      isError: false,
      content: [{ type: 'text', text: '/Users/alex/Output/静态图-01.png' }],
      subCalls: [],
    }] as never)

    expect(results).toEqual([{
      callId: 'delivery-result',
      nodeSeq: 17,
      nodeTime: 1700000017000,
      toolName: 'recovered_tool_result',
      output: '/Users/alex/Output/静态图-01.png',
      isError: false,
    }])
  })

  it('assigns a completed subtool to its enclosing timeline node', () => {
    const results = conversationProductResults([{
      kind: 'tool-result',
      seq: 23,
      time: 1700000023000,
      callId: 'root',
      call: { name: 'workflow_run', argsRaw: '{}' },
      isError: false,
      content: [],
      subCalls: [{
        kind: 'tool-result',
        time: 1700000021000,
        callId: 'delivery',
        call: { name: 'image_generator', argsRaw: '{}' },
        isError: false,
        content: [{ type: 'text', text: '/Users/alex/Output/静态图-01.png' }],
        subCalls: [],
      }],
    }] as never)

    expect(results).toContainEqual({
      callId: 'delivery',
      nodeSeq: 23,
      nodeTime: 1700000021000,
      toolName: 'image_generator',
      output: '/Users/alex/Output/静态图-01.png',
      isError: false,
    })
  })
})
