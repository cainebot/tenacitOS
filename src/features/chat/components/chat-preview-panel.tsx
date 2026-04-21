'use client'

import { Button } from '@circos/ui'
import { Edit02 } from '@untitledui/icons'
import { ConversationList } from './conversation-list'
import { useConversations } from '../hooks/use-conversations'

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatPreviewPanelProps {
  onOpenWorkspace: (conversationId?: string) => void
  onNewMessage: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChatPreviewPanel({ onOpenWorkspace, onNewMessage }: ChatPreviewPanelProps) {
  const { channels, dms, loading, error, refetch } = useConversations()

  return (
    <div className="flex flex-col h-full bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-secondary">
        <p className="text-sm font-semibold text-primary">Chat</p>
        <Button size="sm" color="secondary" iconLeading={Edit02} onClick={onNewMessage}>
          New message
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <ConversationList
          channels={channels}
          dms={dms}
          loading={loading}
          error={error}
          activeConversationId={null}
          onSelectConversation={(id) => onOpenWorkspace(id)}
          onRetry={refetch}
        />
      </div>
    </div>
  )
}
