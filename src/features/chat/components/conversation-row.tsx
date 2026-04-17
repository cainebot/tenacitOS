'use client'

import { Button as AriaButton } from 'react-aria-components'
import { Avatar, Badge, cx } from '@circos/ui'
import { Hash02, Announcement03 } from '@untitledui/icons'
import type { ConversationWithMeta } from '../hooks/use-conversations'
import { conversationUiType } from '@/lib/chat'

// ── Types ────────────────────────────────────────────────────────────────────

interface ConversationRowProps {
  conversation: ConversationWithMeta
  isActive: boolean
  onPress: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function ConversationRow({ conversation, isActive, onPress }: ConversationRowProps) {
  const uiType = conversationUiType(conversation.conversation_type)
  const isUnread = conversation.unread_count > 0

  const label =
    conversation.conversation_type === 'direct'
      ? conversation.agent_name ?? 'Unknown'
      : conversation.title ?? 'Untitled'

  const ariaLabel = isUnread
    ? `${label} — ${conversation.unread_count} unread messages`
    : label

  return (
    <AriaButton
      className={cx('flex w-full items-center px-1.5 text-left')}
      onPress={onPress}
      aria-label={ariaLabel}
      aria-current={isActive || undefined}
    >
      <div className={cx(
        'flex flex-1 items-center gap-3 overflow-clip p-2 rounded-sm',
        isActive ? 'bg-active' : 'hover:bg-primary_hover',
        'transition duration-100 ease-linear',
      )}>
        {/* Icon and text — Figma gap-md (8px) */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {uiType === 'dm' ? (
            <Avatar
              src={conversation.agent_avatar ?? undefined}
              alt={conversation.agent_name ?? ''}
              size="xs"
              status="online"
            />
          ) : uiType === 'announcement' ? (
            <Announcement03 className="size-5 shrink-0 text-fg-quaternary" />
          ) : (
            <Hash02 className="size-5 shrink-0 text-fg-quaternary" />
          )}
          <span className="flex-1 truncate text-sm font-semibold text-secondary">{label}</span>
        </div>

        {/* Unread badge — Figma gap-lg (12px) from icon+text group */}
        {isUnread && (
          <Badge color="brand" type="modern" size="sm">{conversation.unread_count}</Badge>
        )}
      </div>
    </AriaButton>
  )
}
