'use client'

import { EmptyState } from '@circos/ui'
import { MessageSquare01 } from '@untitledui/icons'

interface ChatEmptyStateProps {
  message?: string
}

export function ChatEmptyState({
  message = 'This conversation is empty. Send a message to get started.',
}: ChatEmptyStateProps) {
  return (
    <EmptyState
      icon={<MessageSquare01 className="size-6" />}
      title="No messages"
      description={message}
    />
  )
}
