'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Avatar, ButtonUtility, LoadingIndicator } from '@circos/ui'
import { DotsHorizontal } from '@untitledui/icons'
import { useAgentChat } from '@/hooks/use-agent-chat'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import { useChatSend } from '../hooks/use-chat-send'
import { useMyParticipant } from '@/contexts/my-participant-context'
import { buildMessageProps, formatTime, formatDate, getDateKey } from '../utils/build-message-props'
import { conversationUiType } from '@/lib/chat'
import { ChatPanelSection, ChatPanelDivider } from '@/components/application/chat-panel'
import { ChatInput } from '@/components/application/chat-input'
import type { ChatInputPayload } from '@/components/application/chat-input'
import { Message } from '@/components/application/message'
import type { MessageAction } from '@/components/application/message-action-panel'
import type { EnrichedMessage } from '@/types/chat'
import type { ConversationWithMeta } from '../hooks/use-conversations'
import { DmCreationPanel } from './dm-creation-panel'
import { ChannelCreationPanel } from './channel-creation-panel'
import { AnnouncementNotice } from './announcement-notice'

// ── Processing state strings (D-07) ──────────────────────────────────────────
const PROCESSING_STATE_STRINGS: Record<string, { en: string; es: string }> = {
  analyzing_image:    { en: 'Analyzing your image...',    es: 'Analizando tu imagen...' },
  transcribing_audio: { en: 'Transcribing your audio...', es: 'Transcribiendo tu audio...' },
  processing_pdf:     { en: 'Reading your document...',   es: 'Leyendo tu documento...' },
  thinking:           { en: 'Thinking...',                 es: 'Pensando...' },
}
const PROCESSING_FALLBACK = { en: 'Processing...', es: 'Procesando...' }

function getProcessingText(state: string, lang: 'en' | 'es' = 'en'): string {
  const entry = PROCESSING_STATE_STRINGS[state]
  if (!entry) return PROCESSING_FALLBACK[lang]
  return entry[lang]
}

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
  // Destructure streaming fields for clarity (Phase 102)
  const { isStreaming, streamingMessages, processingState, streamingMessageId } = chat

  // Agent typing indicator
  const { agents } = useRealtimeAgents()
  const agent = conversation?.agent_name
    ? agents.find((a) => a.name === conversation.agent_name)
    : undefined
  const isAgentTyping = agent?.status === 'thinking'

  // Detect language for processing state strings (D-07)
  const userLang: 'en' | 'es' = (() => {
    const lastUserMsg = [...chat.messages].reverse().find(m => m.isMine && m.text)
    if (!lastUserMsg?.text) return 'en'
    // Simple heuristic: Spanish if common Spanish words present
    const esPattern = /\b(hola|por favor|gracias|como|imagen|enviar|archivo|documento)\b/i
    return esPattern.test(lastUserMsg.text) ? 'es' : 'en'
  })()

  const { handleSend, replyToMessage, setReplyTo, clearReply } = useChatSend({
    conversationId,
    sendMessage: chat.sendMessage,
    shortcuts: [],
  })

  // Phase 102 D-11: Wrap handleSend to add optimistic image preview before upload
  const handleSendWithPreview = useCallback(async (payload: ChatInputPayload) => {
    if (payload.images && payload.images.length > 0) {
      const localUrls = payload.images.map(img => URL.createObjectURL(img))
      chat.addOptimisticImageMessage(
        localUrls,
        participant?.display_name ?? 'You',
        participant?.avatar_url ?? null,
      )
    }
    await handleSend(payload)
  }, [handleSend, chat, participant])

  // ── Scroll management (per D-02, D-03, D-04) ──────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasInitialScrolled = useRef(false)
  const prevMessageCountRef = useRef(0)

  // ── Infinite scroll sentinel (per D-05) ────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollObserverRef = useRef<IntersectionObserver | null>(null)

  // Reset scroll state when switching conversations
  useEffect(() => {
    hasInitialScrolled.current = false
    prevMessageCountRef.current = 0
  }, [conversationId])

  // D-04: Initial load always scrolls to bottom
  // D-02: Use scrollRef + direct scrollTop (ChatPanel pattern)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (!hasInitialScrolled.current && chat.messages.length > 0 && !chat.loading) {
      el.scrollTop = el.scrollHeight
      hasInitialScrolled.current = true
    }
  }, [chat.messages.length, chat.loading])

  // D-03: Auto-scroll on new messages only if within 150px of bottom
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !hasInitialScrolled.current) return
    // Only trigger for new messages (count increase), not loadMore (which prepends)
    if (chat.messages.length > prevMessageCountRef.current && prevMessageCountRef.current > 0) {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight
      if (gap < 150) {
        el.scrollTop = el.scrollHeight
      }
    }
    prevMessageCountRef.current = chat.messages.length
  }, [chat.messages.length])

  // Infinite scroll — IntersectionObserver on sentinel at top of messages
  useEffect(() => {
    if (!sentinelRef.current) return

    scrollObserverRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && chat.hasMore) {
            void chat.loadMore()
          }
        }
      },
      { threshold: 0.1 }
    )

    scrollObserverRef.current.observe(sentinelRef.current)

    return () => {
      scrollObserverRef.current?.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.hasMore, chat.loadMore])

  // Phase 102: Auto-scroll during streaming — keep scroll at bottom as tokens arrive
  useEffect(() => {
    if (streamingMessages.size === 0) return
    const el = scrollRef.current
    if (!el) return
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight
    if (gap < 200) {
      el.scrollTop = el.scrollHeight
    }
  }, [streamingMessages])

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
      {/* Header — Figma: bg-primary, px-xl py-md gap-md, avatar 32px + name + dots button */}
      <header className="flex items-center gap-2 bg-primary px-4 py-2 shrink-0">
        <div className="flex flex-1 items-center gap-2 overflow-clip p-2 rounded-sm">
          <Avatar size="sm" src={conversation?.agent_avatar} alt={conversationTitle} status="online"
            initials={conversationTitle.slice(0, 2).toUpperCase()} />
          <span className="flex-1 truncate text-lg font-semibold text-primary">{conversationTitle}</span>
        </div>
        <ButtonUtility icon={DotsHorizontal} size="sm" color="secondary" />
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-6 py-4">
        {chat.loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-tertiary">Loading messages...</p>
          </div>
        ) : chat.messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-tertiary">No messages yet. Say hello!</p>
          </div>
        ) : (
          <>
            {/* Infinite scroll sentinel — triggers loadMore when user scrolls to top */}
            <div ref={sentinelRef} className="h-1 shrink-0" />
            {chat.hasMore && (
              <div className="flex items-center justify-center py-2">
                <p className="text-xs text-quaternary">Loading older messages...</p>
              </div>
            )}

            {groupedMessages.map((group) => (
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
                    onRetry: () => { void chat.retryMessage(msg.message_id) },
                    onReauth: () => { window.open('/api/auth/openai', '_blank') },
                  }
                  const msgProps = buildMessageProps(msg, baseProps, chat.messages)

                  // Phase 102: Override content with streaming buffer text if currently streaming (D-03)
                  const streamingText = streamingMessages.get(msg.message_id)
                  if (streamingText !== undefined && 'content' in msgProps) {
                    (msgProps as { content: string }).content = streamingText
                  }

                  // Phase 102 D-12: Upload overlay for optimistic image preview messages
                  if (msg._isLocalPreview) {
                    return (
                      <div key={msg.message_id} className="relative">
                        <Message {...msgProps} />
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/40">
                          <LoadingIndicator size="sm" />
                        </div>
                      </div>
                    )
                  }

                  return <Message key={msg.message_id} {...msgProps} />
                })}
              </ChatPanelSection>
            ))}

          </>
        )}

        {/* Processing state — renders as a real agent Message bubble per D-05 */}
        {/* Styling: text-sm italic text-tertiary via [&_p]: Tailwind override */}
        {processingState && !isStreaming && (
          <Message
            type="message"
            senderName={conversation?.agent_name ?? 'Agent'}
            senderAvatar={conversation?.agent_avatar}
            timestamp=""
            content={getProcessingText(processingState, userLang)}
            sent={false}
            className="[&_p]:text-sm [&_p]:italic [&_p]:text-tertiary"
          />
        )}

        {/* Typing indicator — hidden when streaming or processing state is active (D-03) */}
        {isAgentTyping && !isStreaming && !processingState && (
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
          onSend={handleSendWithPreview}
          isStreaming={isStreaming}
          onAbort={() => { void chat.abortStream() }}
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
