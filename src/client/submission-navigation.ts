/** Detect accepted messages without navigating on draft changes or failed sends. */
import type { ConversationNode, ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { useEffect, useRef } from 'react'

interface AcceptedMessages {
  readonly sessionId: string
  readonly latestSeq: number
  readonly queueIds: readonly string[]
}

/** Compare accepted transcript/queue state; mounting and older history do not navigate. */
export function hasNewAcceptedMessage(previous: AcceptedMessages | undefined, current: AcceptedMessages): boolean {
  return previous !== undefined && previous.sessionId === current.sessionId
    && (current.latestSeq > previous.latestSeq || current.queueIds.some(id => !previous.queueIds.includes(id)))
}

/** Return from the mounted artifact view after a message is admitted, including queued messages. */
export function useReturnToChat({ useSession, openView }: Pick<ConvViewProps, 'useSession' | 'openView'>, nodes: readonly ConversationNode[]): void {
  const session = useSession(value => value)
  const previous = useRef<AcceptedMessages>()
  useEffect(() => {
    if (session.openState !== 'open') { previous.current = undefined; return }
    const current = {
      sessionId: session.sessionId,
      latestSeq: nodes.reduce((seq, node) => node.kind === 'user' || node.kind === 'steering' ? Math.max(seq, node.seq) : seq, -1),
      queueIds: session.queue.filter(item => item.placement !== 'context').map(item => item.id),
    }
    const navigate = hasNewAcceptedMessage(previous.current, current)
    previous.current = current
    if (navigate) openView('chat', '')
  }, [nodes, session, openView])
}
