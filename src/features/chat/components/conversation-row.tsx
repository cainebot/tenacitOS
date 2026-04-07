'use client'

import { Button as AriaButton } from 'react-aria-components'
import { cx, Badge, Avatar } from '@circos/ui'
import { Hash01, Announcement01 } from '@untitledui/icons'
import type { ConversationWithMeta } from '../hooks/use-conversations'
import { conversationUiType } from '@/lib/chat'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()

  if (isYesterday) return 'Yesterday'

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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
      className={cx(
        'w-full flex items-center gap-3 px-3 py-2 rounded-md',
        'transition duration-100 ease-linear',
        isActive ? 'bg-active' : 'hover:bg-primary_hover',
      )}
      onPress={onPress}
      aria-label={ariaLabel}
      aria-current={isActive || undefined}
    >
      {/* Left icon area */}
      <div className="shrink-0 size-8 flex items-center justify-center">
        {uiType === 'dm' ? (
          <Avatar
            size="sm"
            src={conversation.agent_avatar}
            alt={conversation.agent_name ?? ''}
            initials={
              conversation.agent_name
                ? conversation.agent_name.slice(0, 2).toUpperCase()
                : '??'
            }
          />
        ) : uiType === 'announcement' ? (
          <Announcement01 className="size-4 text-fg-quaternary" />
        ) : (
          <Hash01 className="size-4 text-fg-quaternary" />
        )}
      </div>

      {/* Center */}
      <div className="flex flex-col flex-1 min-w-0">
        <p
          className={cx(
            'text-sm truncate',
            isUnread ? 'font-semibold text-primary' : 'font-normal text-secondary',
          )}
        >
          {label}
        </p>
        <p className="text-xs text-tertiary truncate">
          {conversation.last_message_text ?? ''}
        </p>
      </div>

      {/* Right */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs text-tertiary">
          {formatTimestamp(conversation.last_message_at)}
        </span>
        {isUnread && (
          <Badge color="brand" type="modern" size="sm">
            {conversation.unread_count}
          </Badge>
        )}
      </div>
    </AriaButton>
  )
}
