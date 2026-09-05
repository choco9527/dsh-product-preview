/** Project successful tool results and assistant text from Conversation nodes. */

import type { ConversationNode, ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ProductToolResult } from '../artifacts.ts'

/** Fallback producer when retained history has a result but no matching call head. */
export const RECOVERED_TOOL_RESULT_NAME = 'recovered_tool_result'
export const ASSISTANT_TEXT_RESULT_NAME = 'assistant_text'

function textContent(blocks: readonly { readonly type?: string; readonly text?: string }[]): string {
  return blocks.flatMap(block => block.type === 'text' && typeof block.text === 'string' ? [block.text] : []).join('\n')
}

function subtoolProductResults(call: ToolCallBlock, nodeSeq: number): readonly ProductToolResult[] {
  const children = call.subCalls.flatMap(child => subtoolProductResults(child, nodeSeq))
  if (!('kind' in call) || call.kind !== 'tool-result' || call.isError) return children
  const output = textContent(call.content)
  if (output === '') return children
  return [{
    callId: call.callId,
    nodeSeq,
    toolName: call.call?.name ?? RECOVERED_TOOL_RESULT_NAME,
    output,
    isError: false,
  }, ...children]
}

/** Extract settled text while preserving the Conversation node that produced it. */
export function conversationProductResults(nodes: readonly ConversationNode[]): readonly ProductToolResult[] {
  return nodes.flatMap(node => {
    if (node.kind === 'tool-result') return subtoolProductResults(node, node.seq)
    if (node.kind !== 'assistant') return []
    const output = node.blocks.flatMap(block => block.kind === 'text' ? [block.text] : []).join('\n')
    return output === '' ? [] : [{
      callId: `assistant-${String(node.seq)}`,
      nodeSeq: node.seq,
      toolName: ASSISTANT_TEXT_RESULT_NAME,
      output,
      isError: false,
    }]
  })
}
