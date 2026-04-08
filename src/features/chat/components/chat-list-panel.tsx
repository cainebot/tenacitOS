'use client'

import { useState } from 'react'
import { cx, Input, Skeleton } from '@circos/ui'
import { ChevronDown, SearchMd } from '@untitledui/icons'
import { ConversationRow } from './conversation-row'
import { NewMessageMenu } from './new-message-menu'
import type { ConversationWithMeta } from '../hooks/use-conversations'

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatListPanelProps {
  channels: ConversationWithMeta[]
  dms: ConversationWithMeta[]
  loading: boolean
  error: string | null
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewDm: () => void
  onNewChannel: () => void
  onRetry: () => void
}

// ── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ label, isOpen, onToggle }: { label: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-[5px] px-4 shrink-0 w-full text-left"
    >
      <span className="text-sm font-medium text-tertiary">{label}</span>
      <ChevronDown className={cx('size-4 text-fg-quaternary transition duration-100 ease-linear', !isOpen && '-rotate-90')} />
    </button>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChatListPanel({
  channels,
  dms,
  loading,
  error,
  activeConversationId,
  onSelectConversation,
  onNewDm,
  onNewChannel,
  onRetry,
}: ChatListPanelProps) {
  const [announcementsOpen, setAnnouncementsOpen] = useState(true)
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [dmsOpen, setDmsOpen] = useState(true)

  const announcements = channels.filter(c => c.conversation_type === 'broadcast')
  const groupChannels = channels.filter(c => c.conversation_type === 'group')

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 px-4 py-2">
          <h2 className="flex-1 text-lg font-semibold text-primary">Chat</h2>
        </div>
        <div className="flex flex-col gap-2 px-4 py-4">
          <Skeleton className="h-9 w-full rounded-sm" />
          <Skeleton className="h-9 w-full rounded-sm" />
          <Skeleton className="h-9 w-full rounded-sm" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 px-4 py-2">
          <h2 className="flex-1 text-lg font-semibold text-primary">Chat</h2>
        </div>
        <div className="px-4 py-8">
          <p className="text-sm text-error-primary">{error}</p>
          <button type="button" onClick={onRetry} className="mt-2 text-sm font-medium text-brand-secondary hover:underline">
            Retry
          </button>
        </div>
      </div>
    )
  }

  const isEmpty = announcements.length === 0 && groupChannels.length === 0 && dms.length === 0

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0">
        <h2 className="flex-1 text-lg font-semibold text-primary">Chat</h2>
        <NewMessageMenu onSelectDm={onNewDm} onSelectChannel={onNewChannel} />
      </div>

      {/* Search */}
      <div className="px-4 py-1.5 shrink-0">
        <Input placeholder="Search" icon={SearchMd} size="sm" />
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <p className="text-sm text-tertiary px-4 py-8 text-center">No conversations yet</p>
        ) : (
          <>
            {/* Announcement section */}
            {announcements.length > 0 && (
              <div className="flex flex-col gap-0.5 items-start overflow-clip py-1.5 w-full">
                <SectionHeader label="Announcement" isOpen={announcementsOpen} onToggle={() => setAnnouncementsOpen(v => !v)} />
                {announcementsOpen && announcements.map(c => (
                  <ConversationRow
                    key={c.conversation_id}
                    conversation={c}
                    isActive={activeConversationId === c.conversation_id}
                    onPress={() => onSelectConversation(c.conversation_id)}
                  />
                ))}
              </div>
            )}

            {/* Channels section */}
            {groupChannels.length > 0 && (
              <div className="flex flex-col gap-0.5 items-start overflow-clip py-1.5 w-full">
                <SectionHeader label="Channels" isOpen={channelsOpen} onToggle={() => setChannelsOpen(v => !v)} />
                {channelsOpen && groupChannels.map(c => (
                  <ConversationRow
                    key={c.conversation_id}
                    conversation={c}
                    isActive={activeConversationId === c.conversation_id}
                    onPress={() => onSelectConversation(c.conversation_id)}
                  />
                ))}
              </div>
            )}

            {/* Direct Messages section */}
            {dms.length > 0 && (
              <div className="flex flex-col gap-0.5 items-start overflow-clip py-1.5 w-full">
                <SectionHeader label="Direct Messages" isOpen={dmsOpen} onToggle={() => setDmsOpen(v => !v)} />
                {dmsOpen && dms.map(c => (
                  <ConversationRow
                    key={c.conversation_id}
                    conversation={c}
                    isActive={activeConversationId === c.conversation_id}
                    onPress={() => onSelectConversation(c.conversation_id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
