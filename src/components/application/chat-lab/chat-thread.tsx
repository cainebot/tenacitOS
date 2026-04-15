'use client'

import type { ChatThreadItem } from './types'
import { ChatUserMessage } from './chat-user-message'
import { ChatAssistantMessage } from './chat-assistant-message'
import { ChatTimelineEvent } from './chat-timeline-event'
import { ChatRunMarker } from './chat-run-marker'
import { ChatEmptyState } from './chat-empty-state'
import { ChatComposer } from './chat-composer'

interface ChatThreadProps {
  items: ChatThreadItem[]
  showComposer?: boolean
  composerDisabledReason?: string
}

export function ChatThread({
  items,
  showComposer = false,
  composerDisabledReason,
}: ChatThreadProps) {
  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <ChatEmptyState />
        {showComposer && (
          <ChatComposer
            disabled={!!composerDisabledReason}
            disabledReason={composerDisabledReason}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item, idx) => {
        switch (item.type) {
          case 'timeline-event':
            return (
              <ChatTimelineEvent
                key={item.id}
                data={item.data}
                connector={
                  idx < items.length - 1 &&
                  items[idx + 1]?.type === 'timeline-event'
                }
              />
            )
          case 'user-message':
            return <ChatUserMessage key={item.id} data={item.data} />
          case 'assistant-message':
            return <ChatAssistantMessage key={item.id} data={item.data} />
          case 'run-marker':
            return <ChatRunMarker key={item.id} data={item.data} />
          default:
            return null
        }
      })}

      {showComposer && (
        <ChatComposer
          disabled={!!composerDisabledReason}
          disabledReason={composerDisabledReason}
        />
      )}
    </div>
  )
}
