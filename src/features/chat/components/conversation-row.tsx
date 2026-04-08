'use client'

import { Button as AriaButton } from 'react-aria-components'
import { cx, Avatar } from '@circos/ui'
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
      className={cx('flex w-full items-center px-1.5')}
      onPress={onPress}
      aria-label={ariaLabel}
      aria-current={isActive || undefined}
    >
      <div className={cx(
        'flex flex-1 items-center gap-2 overflow-clip p-2 rounded-sm',
        isActive ? 'bg-active' : 'hover:bg-primary_hover',
        'transition duration-100 ease-linear',
      )}>
        {/* Icon/Avatar area */}
        <div className="shrink-0">
          {uiType === 'dm' ? (
            <Avatar
              size="xs"
              src={conversation.agent_avatar}
              alt={conversation.agent_name ?? ''}
              status="online"
              initials={
                conversation.agent_name
                  ? conversation.agent_name.slice(0, 2).toUpperCase()
                  : '??'
              }
            />
          ) : uiType === 'announcement' ? (
            <Announcement03 className="size-5 text-fg-quaternary" />
          ) : (
            <Hash02 className="size-5 text-fg-quaternary" />
          )}
        </div>

        {/* Label */}
        <span className="flex-1 truncate text-sm font-semibold text-secondary">{label}</span>

        {/* Unread badge — raw span, NOT UUI Badge */}
        {isUnread && (
          <span className="shrink-0 rounded border border-secondary px-1 py-px text-xs font-medium text-tertiary">
            {conversation.unread_count}
          </span>
        )}
      </div>
    </AriaButton>
  )
}
