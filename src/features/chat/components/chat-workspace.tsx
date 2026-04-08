'use client'

import { useState, useEffect, useRef } from 'react'
import { cx, Button, SIDEBAR, Avatar, BadgeWithDot } from '@circos/ui'
import { Edit02, XClose, Hash01 } from '@untitledui/icons'
import { ConversationList } from './conversation-list'
import { NewMessageMenu } from './new-message-menu'
import { DmCreationPanel } from './dm-creation-panel'
import { ChannelCreationPanel } from './channel-creation-panel'
import { AnnouncementNotice } from './announcement-notice'
import { useConversations } from '../hooks/use-conversations'
import { useAgentChat } from '@/hooks/use-agent-chat'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import { useChatSend } from '../hooks/use-chat-send'
import { conversationUiType } from '@/lib/chat'
import { useMyParticipant } from '@/contexts/my-participant-context'
import { ChatPanel, ChatPanelSection, ChatPanelDivider } from '@/components/application/chat-panel'
import { ChatInput } from '@/components/application/chat-input'
import { Message, type MessageProps } from '@/components/application/message'
import type { EnrichedMessage, MessageAttachmentRow } from '@/types/chat'
import type { MessageAction } from '@/components/application/message-action-panel'
import type { MessageStatus } from '@/components/application/message-status-icon'
import { formatBytes } from '@/lib/format'
import type { ConversationWithMeta } from '../hooks/use-conversations'

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatWorkspaceProps {
  onClose: () => void
  initialConversationId?: string | null
}

type WorkspaceView = 'conversations' | 'new-dm' | 'new-channel'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoString))
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (msgDay.getTime() === today.getTime()) return 'Today'
  if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday'

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function getDateKey(isoString: string): string {
  const date = new Date(isoString)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function extname(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx > 0 ? filename.substring(idx) : ''
}

const VIDEO_THUMBNAIL_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" fill="%23525866"><rect width="320" height="180" rx="8"/><text x="160" y="98" text-anchor="middle" fill="%23999" font-size="14">Video</text></svg>'
)

function buildMessageProps(
  msg: EnrichedMessage,
  baseProps: {
    sent: boolean
    senderName: string
    senderAvatar?: string
    timestamp: string
    status?: MessageStatus
    reactions: { emoji: string; count: number; isSelected: boolean; onPress?: () => void }[]
    actions?: MessageAction[]
    onAction?: (action: MessageAction) => void
    onReact?: (emoji: string) => void
  },
  allMessages: EnrichedMessage[]
): MessageProps {
  const att: MessageAttachmentRow | undefined = msg.attachments[0]

  switch (msg.messageType) {
    case 'file':
      return {
        ...baseProps,
        type: 'file',
        fileName: att?.filename ?? 'file',
        fileSize: att ? formatBytes(att.size_bytes) : '0 B',
        fileExtension: att ? extname(att.filename) : '',
        onDownload: att?.url ? () => window.open(att.url, '_blank') : undefined,
      }
    case 'image':
      return {
        ...baseProps,
        type: 'image',
        src: att?.url ?? '',
        alt: att?.filename ?? 'Image',
        fileName: att?.filename,
        fileSize: att ? formatBytes(att.size_bytes) : undefined,
      }
    case 'audio':
      return {
        ...baseProps,
        type: 'audio',
        duration: att?.duration_seconds
          ? `${Math.floor(att.duration_seconds / 60)}:${Math.floor(att.duration_seconds % 60).toString().padStart(2, '0')}`
          : '0:00',
      }
    case 'video':
      return {
        ...baseProps,
        type: 'video',
        thumbnailSrc: att?.thumbnail_storage_path
          ? (att.url ?? VIDEO_THUMBNAIL_PLACEHOLDER)
          : VIDEO_THUMBNAIL_PLACEHOLDER,
      }
    case 'link-preview':
      return {
        ...baseProps,
        type: 'link-preview',
        url: msg.og_url ?? msg.text ?? '',
        imageSrc: msg.og_image_url ?? undefined,
      }
    default: {
      if (msg.parent_message_id) {
        const parent = allMessages.find((m) => m.message_id === msg.parent_message_id)
        const replyText = parent?.text
          ? parent.text.length > 100 ? parent.text.substring(0, 100) + '...' : parent.text
          : '...'
        return {
          ...baseProps,
          type: 'message-reply' as const,
          content: msg.text ?? '',
          replyText,
        }
      }
      return {
        ...baseProps,
        type: 'message',
        content: msg.text ?? '',
      }
    }
  }
}

// ── WorkspaceConversationView ─────────────────────────────────────────────────

interface WorkspaceConversationViewProps {
  conversationId: string
  conversation: ConversationWithMeta | undefined
}

function WorkspaceConversationView({ conversationId, conversation }: WorkspaceConversationViewProps) {
  const { participant } = useMyParticipant()
  const myParticipantId = participant?.participant_id ?? ''
  const [recipientIds, setRecipientIds] = useState<string[]>([])

  // Fetch all participants for the conversation (excluding self)
  // Routes through API to bypass RLS (browser has no auth session)
  useEffect(() => {
    if (!conversationId || !myParticipantId) return
    fetch(`/api/conversations/${conversationId}/participants`)
      .then(res => res.ok ? res.json() : [])
      .then((data: Array<{ participant_id: string }>) => {
        setRecipientIds(
          data
            .map(d => d.participant_id)
            .filter(id => id !== myParticipantId)
        )
      })
      .catch(() => setRecipientIds([]))
  }, [conversationId, myParticipantId])

  const chat = useAgentChat({ conversationId, recipientIds })

  // Agent typing indicator — match agent by conversation's agent_name
  const { agents } = useRealtimeAgents()
  const agent = conversation?.agent_name
    ? agents.find((a) => a.name === conversation.agent_name)
    : undefined
  const isAgentTyping = agent?.status === 'thinking'

  const { handleSend, replyToMessage, setReplyTo, clearReply } = useChatSend({
    conversationId,
    sendMessage: chat.sendMessage,
    shortcuts: [],
  })

  const uiType = conversation ? conversationUiType(conversation.conversation_type) : null
  const isAnnouncement = uiType === 'announcement'

  // Build conversation title
  let conversationTitle = conversation?.title ?? 'Conversation'
  if (uiType === 'dm' && conversation?.agent_name) {
    conversationTitle = conversation.agent_name
  }

  // Actions per conversation type
  const messageActions: MessageAction[] = isAnnouncement ? ['copy'] : ['copy', 'reply', 'retry']

  // Group messages by date
  const groupedMessages: { dateKey: string; dateLabel: string; messages: EnrichedMessage[] }[] = []
  for (const msg of chat.messages) {
    const dateKey = getDateKey(msg.created_at)
    const last = groupedMessages[groupedMessages.length - 1]
    if (last && last.dateKey === dateKey) {
      last.messages.push(msg)
    } else {
      groupedMessages.push({
        dateKey,
        dateLabel: formatDate(msg.created_at),
        messages: [msg],
      })
    }
  }

  const footer = (
    <>
      {isAnnouncement && <AnnouncementNotice />}
      <ChatInput
        type="advanced"
        onSend={handleSend}
        replyTo={
          replyToMessage
            ? {
                senderName: replyToMessage.senderName,
                text: replyToMessage.text?.substring(0, 100) ?? '',
              }
            : undefined
        }
        onClearReply={clearReply}
      />
    </>
  )

  return (
    <ChatPanel title={conversationTitle} footer={footer} className="flex-1">
      {chat.loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-tertiary">Loading messages...</p>
        </div>
      ) : chat.messages.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-tertiary">No messages yet. Say hello!</p>
        </div>
      ) : (
        groupedMessages.map((group) => (
          <ChatPanelSection key={group.dateKey}>
            <ChatPanelDivider label={group.dateLabel} />
            {group.messages.map((msg) => {
              const baseProps = {
                sent: msg.isMine,
                senderName: msg.senderName,
                senderAvatar: msg.senderAvatar ?? undefined,
                timestamp: formatTime(msg.created_at),
                status: msg.statusIcon,
                reactions: msg.reactions.map((r) => ({
                  emoji: r.emoji,
                  count: r.count,
                  isSelected: r.selected,
                  onPress: () => chat.toggleReaction(msg.message_id, r.emoji),
                })),
                actions: messageActions,
                onAction: (action: MessageAction) => {
                  if (action === 'copy') {
                    void navigator.clipboard.writeText(msg.text ?? '')
                  } else if (action === 'reply' && !isAnnouncement) {
                    setReplyTo(msg)
                  } else if (action === 'retry' && msg._failed) {
                    void chat.retryMessage(msg.message_id)
                  }
                },
                onReact: (emoji: string) => chat.toggleReaction(msg.message_id, emoji),
              }
              const msgProps = buildMessageProps(msg, baseProps, chat.messages)
              return <Message key={msg.message_id} {...msgProps} />
            })}
          </ChatPanelSection>
        ))
      )}
      {isAgentTyping && (
        <Message
          type="writing"
          senderName={conversation?.agent_name ?? 'Agent'}
          senderAvatar={conversation?.agent_avatar}
          timestamp=""
        />
      )}
    </ChatPanel>
  )
}

// ── ChatWorkspace ─────────────────────────────────────────────────────────────

export function ChatWorkspace({ onClose, initialConversationId }: ChatWorkspaceProps) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversationId ?? null,
  )
  const [view, setView] = useState<WorkspaceView>('conversations')
  const { channels, dms, loading, error, refetch } = useConversations()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Dismiss on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Focus close button on mount
  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  const activeConversation = [...channels, ...dms].find(
    (c) => c.conversation_id === activeConversationId
  )

  return (
    <div
      className="fixed inset-0 z-50 bg-overlay/20"
      onClick={onClose}
    >
      <div
        className="absolute top-0 right-0 bottom-0 flex bg-primary shadow-2xl"
        style={{ left: SIDEBAR.SLIM_WIDTH }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left list panel */}
        <div className="w-[260px] shrink-0 flex flex-col border-r border-secondary h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-3 border-b border-secondary shrink-0">
            <p className="text-sm font-semibold text-primary">Chat</p>
            <div className="flex items-center gap-1">
              <NewMessageMenu
                onSelectDm={() => setView('new-dm')}
                onSelectChannel={() => setView('new-channel')}
              />
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className={cx(
                  'flex items-center justify-center size-8 rounded-md',
                  'text-fg-quaternary hover:bg-primary_hover',
                  'transition duration-100 ease-linear',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                )}
                aria-label="Close chat"
              >
                <XClose className="size-4" />
              </button>
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              channels={channels}
              dms={dms}
              loading={loading}
              error={error}
              activeConversationId={activeConversationId}
              onSelectConversation={(id) => {
                setActiveConversationId(id)
                setView('conversations')
              }}
              onRetry={refetch}
            />
          </div>
        </div>

        {/* Right conversation view */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {view === 'new-dm' && (
            <DmCreationPanel
              onBack={() => setView('conversations')}
              onConversationCreated={(id) => {
                setActiveConversationId(id)
                setView('conversations')
                void refetch()
              }}
            />
          )}

          {view === 'new-channel' && (
            <ChannelCreationPanel
              existingChannelNames={channels.map((c) => c.title ?? '').filter(Boolean)}
              onBack={() => setView('conversations')}
              onChannelCreated={(id) => {
                setActiveConversationId(id)
                setView('conversations')
                void refetch()
              }}
            />
          )}

          {view === 'conversations' && activeConversationId && (
            <WorkspaceConversationView
              conversationId={activeConversationId}
              conversation={activeConversation}
            />
          )}

          {view === 'conversations' && !activeConversationId && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <p className="text-sm font-semibold text-primary">Select a conversation</p>
              <p className="text-sm text-tertiary">
                Choose from your channels or direct messages to start chatting.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
