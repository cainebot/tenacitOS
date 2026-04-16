'use client'

import { useState } from 'react'
import { Button as AriaButton } from 'react-aria-components'
import { cx, Skeleton, FeaturedIcon, Button } from '@circos/ui'
import { ChevronDown, MessageCircle01, AlertCircle } from '@untitledui/icons'
import { ConversationRow } from './conversation-row'
import type { ConversationWithMeta } from '../hooks/use-conversations'

// ── Types ────────────────────────────────────────────────────────────────────

interface ConversationListProps {
  channels: ConversationWithMeta[]
  dms: ConversationWithMeta[]
  loading: boolean
  error: string | null
  activeConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  onRetry: () => void
  headerRight?: React.ReactNode
}

// ── Section header ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  label: string
  isCollapsed: boolean
  onToggle: () => void
}

function SectionHeader({ label, isCollapsed, onToggle }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <p className="text-xs font-semibold text-quaternary uppercase tracking-wider">
        {label}
      </p>
      <AriaButton
        className="p-0.5 rounded hover:bg-primary_hover transition duration-100 ease-linear"
        aria-label={`Toggle ${label} section`}
        onPress={onToggle}
      >
        <ChevronDown
          className={cx(
            'size-3.5 text-fg-quaternary transition-transform duration-100',
            isCollapsed && '-rotate-90',
          )}
        />
      </AriaButton>
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function ConversationList({
  channels,
  dms,
  loading,
  error,
  activeConversationId,
  onSelectConversation,
  onRetry,
  headerRight,
}: ConversationListProps) {
  const [channelsCollapsed, setChannelsCollapsed] = useState(false)
  const [dmsCollapsed, setDmsCollapsed] = useState(false)

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col gap-1 px-2 py-2">
        <Skeleton className="h-14 w-full rounded-md" />
        <Skeleton className="h-14 w-full rounded-md" />
        <Skeleton className="h-14 w-full rounded-md" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
        <FeaturedIcon icon={<AlertCircle />} color="error" variant="light" size="lg" />
        <p className="text-sm text-secondary">
          Could not load conversations. Check your connection and try again.
        </p>
        <Button color="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }

  // Empty state
  if (channels.length === 0 && dms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
        <FeaturedIcon icon={<MessageCircle01 />} color="brand" variant="light" size="lg" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-primary">No conversations yet</p>
          <p className="text-sm text-tertiary">
            Start a direct message or create a channel to connect with your agents.
          </p>
        </div>
        {headerRight}
      </div>
    )
  }

  // Sort channels: announcements (broadcast) first, then channels (group)
  const sortedChannels = [...channels].sort((a, b) => {
    if (a.conversation_type === 'broadcast' && b.conversation_type !== 'broadcast') return -1
    if (a.conversation_type !== 'broadcast' && b.conversation_type === 'broadcast') return 1
    return 0
  })

  return (
    <div className="flex flex-col overflow-y-auto">
      {/* Channels section */}
      {channels.length > 0 && (
        <div>
          <SectionHeader
            label="Channels"
            isCollapsed={channelsCollapsed}
            onToggle={() => setChannelsCollapsed((prev) => !prev)}
          />
          {!channelsCollapsed && (
            <div className="flex flex-col px-2">
              {sortedChannels.map((conversation) => (
                <ConversationRow
                  key={conversation.conversation_id}
                  conversation={conversation}
                  isActive={activeConversationId === conversation.conversation_id}
                  onPress={() => onSelectConversation(conversation.conversation_id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Direct messages section */}
      {dms.length > 0 && (
        <div>
          <SectionHeader
            label="Direct messages"
            isCollapsed={dmsCollapsed}
            onToggle={() => setDmsCollapsed((prev) => !prev)}
          />
          {!dmsCollapsed && (
            <div className="flex flex-col px-2">
              {dms.map((conversation) => (
                <ConversationRow
                  key={conversation.conversation_id}
                  conversation={conversation}
                  isActive={activeConversationId === conversation.conversation_id}
                  onPress={() => onSelectConversation(conversation.conversation_id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
