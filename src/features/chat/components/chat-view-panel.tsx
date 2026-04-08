'use client'

import { useState, useEffect } from 'react'
import { Avatar } from '@circos/ui'
import { useAgentChat } from '@/hooks/use-agent-chat'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import { useChatSend } from '../hooks/use-chat-send'
import { useMyParticipant } from '@/contexts/my-participant-context'
import { buildMessageProps, formatTime, formatDate, getDateKey } from '../utils/build-message-props'
import { conversationUiType } from '@/lib/chat'
import { ChatPanelSection, ChatPanelDivider } from '@/components/application/chat-panel'
import { ChatInput } from '@/components/application/chat-input'
import { Message } from '@/components/application/message'
import type { MessageAction } from '@/components/application/message-action-panel'
import type { EnrichedMessage } from '@/types/chat'
import type { ConversationWithMeta } from '../hooks/use-conversations'
import { DmCreationPanel } from './dm-creation-panel'
import { ChannelCreationPanel } from './channel-creation-panel'
import { AnnouncementNotice } from './announcement-notice'

// ── Types ────────────────────────────────────────────────────────────────────

export type ChatView = 'conversations' | 'new-dm' | 'new-channel'

interface ChatViewPanelProps {
  activeConversationId: string | null
  conversation: ConversationWithMeta | undefined
  channels: ConversationWithMeta[]
  view: ChatView
  onConversationCreated: (id: string) => void
  onBack: () => void
  refetch: () => void
}

// ── Inner conversation view ─────────────────────────────────────────────────

function ConversationView({ conversationId, conversation }: { conversationId: string; conversation: ConversationWithMeta | undefined }) {
  const { participant } = useMyParticipant()
  const myParticipantId = participant?.participant_id ?? ''
  const [recipientIds, setRecipientIds] = useState<string[]>([])

  // Fetch all participants for the conversation (excluding self)
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

  // Agent typing indicator
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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-2 border-b border-secondary px-4 py-3 shrink-0">
        <Avatar size="sm" src={conversation?.agent_avatar} alt={conversationTitle} status="online"
          initials={conversationTitle.slice(0, 2).toUpperCase()} />
        <span className="flex-1 truncate text-lg font-semibold text-primary">{conversationTitle}</span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
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
      </div>

      {/* Footer input */}
      <div className="shrink-0 px-4 pb-4">
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
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function ChatViewPanel({
  activeConversationId,
  conversation,
  channels,
  view,
  onConversationCreated,
  onBack,
}: ChatViewPanelProps) {
  if (view === 'new-dm') {
    return <DmCreationPanel onBack={onBack} onConversationCreated={onConversationCreated} />
  }

  if (view === 'new-channel') {
    return (
      <ChannelCreationPanel
        existingChannelNames={channels.map(c => c.title ?? '').filter(Boolean)}
        onBack={onBack}
        onChannelCreated={onConversationCreated}
      />
    )
  }

  if (activeConversationId) {
    return <ConversationView conversationId={activeConversationId} conversation={conversation} />
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      <p className="text-sm font-semibold text-primary">Select a conversation</p>
      <p className="text-sm text-tertiary">Choose from your channels or direct messages to start chatting.</p>
    </div>
  )
}
