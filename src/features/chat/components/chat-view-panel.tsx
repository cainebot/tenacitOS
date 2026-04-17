'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Avatar, ButtonUtility, Dropdown, LoadingIndicator } from '@circos/ui'
import { AlertCircle, DotsHorizontal } from '@untitledui/icons'
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
import { OAuthReconnectBanner } from './oauth-reconnect-banner'

// ── Processing state strings (D-07) ──────────────────────────────────────────
const PROCESSING_STATE_STRINGS: Record<string, { en: string; es: string }> = {
  analyzing_image:    { en: 'Analyzing your image...',    es: 'Analizando tu imagen...' },
  transcribing_audio: { en: 'Transcribing your audio...', es: 'Transcribiendo tu audio...' },
  processing_pdf:     { en: 'Reading your document...',   es: 'Leyendo tu documento...' },
  processing_video:   { en: 'Analyzing your video...',    es: 'Analizando tu video...' },
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

// Participant shape with full fields for @mention and typing bubbles
interface ConversationParticipant {
  participant_id: string
  participant_type: 'human' | 'agent'
  display_name: string
  avatar_url: string | null
}

function ConversationView({ conversationId, conversation, refetch }: { conversationId: string; conversation: ConversationWithMeta | undefined; refetch: () => void }) {
  const { participant } = useMyParticipant()
  const myParticipantId = participant?.participant_id ?? ''
  const [recipientIds, setRecipientIds] = useState<string[]>([])
  // Full participant data for @mention autocomplete and multi-agent typing bubbles (Phase 104)
  const [participants, setParticipants] = useState<ConversationParticipant[]>([])

  // Fetch all participants for the conversation (excluding self)
  useEffect(() => {
    if (!conversationId || !myParticipantId) return
    fetch(`/api/conversations/${conversationId}/participants`)
      .then(res => res.ok ? res.json() : [])
      .then((data: Array<{ participant_id: string; participant_type?: string; display_name?: string; avatar_url?: string | null }>) => {
        setRecipientIds(
          data
            .map(d => d.participant_id)
            .filter(id => id !== myParticipantId)
        )
        // Store full participant data for @mention and typing bubbles
        setParticipants(
          data
            .filter(d => d.participant_id !== myParticipantId)
            .map(d => ({
              participant_id: d.participant_id,
              participant_type: (d.participant_type ?? 'human') as 'human' | 'agent',
              display_name: d.display_name ?? d.participant_id,
              avatar_url: d.avatar_url ?? null,
            }))
        )
      })
      .catch((err) => {
        console.warn(`[ChatViewPanel] Failed to load participants for ${conversationId}:`, err)
        setRecipientIds([])
        setParticipants([])
      })
  }, [conversationId, myParticipantId])

  const chat = useAgentChat({ conversationId, recipientIds })
  // Destructure streaming fields for clarity (Phase 102)
  const {
    isStreaming,
    streamingMessages,
    processingState,
    streamingMessageId,
    waitingForReply,
    oauthExpired,
    isCancelling,
  } = chat
  const isGenerationActive = waitingForReply || !!processingState || isStreaming

  // Agent typing indicator
  const { agents } = useRealtimeAgents()
  const agent = conversation?.agent_name
    ? agents.find((a) => a.name === conversation.agent_name)
    : undefined
  const isAgentTyping = agent?.status === 'thinking'

  // Multi-agent processing detection for group conversations (Phase 104, GROUP-09, D-12)
  const conversationType = conversation?.conversation_type ?? 'direct'
  const isGroupConversation = conversationType === 'group'

  const processingAgents = useMemo(() => {
    if (!isGroupConversation) return []
    if (!chat.streamingMessages || chat.streamingMessages.size === 0) return []
    // Find the sender_ids of messages that are currently being streamed
    const streamingMessageIds = Array.from(chat.streamingMessages.keys())
    const streamingSenderIds = new Set(
      chat.messages
        .filter(m => streamingMessageIds.includes(m.message_id))
        .map(m => m.sender_id)
    )
    // Match streaming sender_ids to agent participants
    const agentParticipants = participants.filter(p => p.participant_type === 'agent')
    return agentParticipants.filter(ap => streamingSenderIds.has(ap.participant_id))
  }, [chat.streamingMessages, chat.messages, participants, isGroupConversation])

  // @mention autocomplete agents — only in group conversations (Phase 104, GROUP-07, D-10)
  const mentionableAgents = useMemo(() => {
    if (!isGroupConversation) return undefined
    return participants
      .filter(p => p.participant_type === 'agent')
      .map(p => ({
        participant_id: p.participant_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      }))
  }, [isGroupConversation, participants])

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

  // Phase 102 D-11 + gap-closure: Wrap handleSend to add optimistic image preview before upload
  const handleSendWithPreview = useCallback(async (payload: ChatInputPayload) => {
    let tempId: string | null = null

    if (payload.images && payload.images.length > 0) {
      const localUrls = payload.images.map(img => URL.createObjectURL(img))
      tempId = chat.addOptimisticImageMessage(
        localUrls,
        participant?.display_name ?? 'You',
        participant?.avatar_url ?? null,
        payload.images,
      )
    }

    // Safety timeout: if optimistic message is still present after 30s, transition to error
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null
    if (tempId) {
      const capturedTempId = tempId
      timeoutHandle = setTimeout(() => {
        chat.setUploadError(capturedTempId)
      }, 30_000)
    }

    try {
      await handleSend(payload)
    } catch {
      // D-06: Upload failed — transition to error state, don't delete
      if (tempId) {
        chat.setUploadError(tempId)
      }
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle)
    }
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

  // ── Bulk mark-on-open read receipts ───────────────────────────────────────
  // Opening a conversation marks ALL unread messages as read — including ones
  // older than the 30-message window currently held in memory by useAgentChat.
  // The server resolves the full unread set via `mark_all_unread: true`. The
  // /api/conversations/[id]/receipts endpoint is idempotent (onConflict upsert)
  // so repeated calls are safe. After write we refetch the conversations list
  // so the sidebar/global badges converge without relying on Realtime.
  useEffect(() => {
    if (!conversationId || !myParticipantId) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}/receipts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mark_all_unread: true,
            participant_id: myParticipantId,
            status: 'read',
          }),
        })
        if (!cancelled && res.ok) refetch()
      } catch {
        // best-effort
      }
    })()
    return () => { cancelled = true }
  }, [conversationId, myParticipantId, refetch])

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

      {/* OAUTH-02: Reconnection banner — appears when oauth_expired detected via Realtime or mount-time query */}
      <OAuthReconnectBanner visible={oauthExpired} />

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
                  // Hide agent messages with no text and no attachments — UNLESS
                  // the message is actively streaming (streamingMessages has its text).
                  // Without this check, the streaming override at line ~311 never runs
                  // because this filter returns null before reaching it.
                  if (
                    !msg.isMine &&
                    !msg.text &&
                    !streamingMessages.has(msg.message_id) &&
                    (!msg.attachments || msg.attachments.length === 0)
                  ) {
                    return null
                  }

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

                  // Phase 102.1: Upload states for optimistic image preview messages
                  if (msg._isLocalPreview) {
                    if (msg._uploadError) {
                      // D-06: Error state — show bubble with (!) icon + retry/delete dropdown
                      return (
                        <div key={msg.message_id} className="flex items-center gap-1 justify-end">
                          <Message {...msgProps} />
                          <Dropdown.Root>
                            <ButtonUtility icon={AlertCircle} size="sm" color="tertiary" className="text-error-primary" aria-label="Error al enviar" />
                            <Dropdown.Popover placement="bottom end">
                              <Dropdown.Menu>
                                <Dropdown.Item
                                  onAction={() => {
                                    // D-08: Retry from stored File/Blob
                                    const files = msg._pendingFiles
                                    if (files && files.length > 0) {
                                      chat.removeOptimisticMessage(msg.message_id)
                                      void handleSendWithPreview({ text: msg.text ?? '', images: files })
                                    }
                                  }}
                                >
                                  <span className="text-primary">Reintentar</span>
                                </Dropdown.Item>
                                <Dropdown.Item
                                  onAction={() => {
                                    // D-09: Delete failed message + revoke ObjectURLs
                                    chat.removeOptimisticMessage(msg.message_id)
                                  }}
                                >
                                  <span className="text-error-primary">Eliminar</span>
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown.Root>
                        </div>
                      )
                    }

                    // Normal uploading state — loading overlay
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

        {/* Multi-agent typing bubbles — group conversations (Phase 104, GROUP-09, D-12) */}
        {processingAgents.length > 0 && (
          <div className="flex flex-col gap-1" aria-live="polite">
            {processingAgents.length <= 5 ? (
              processingAgents.map(agentItem => (
                <div key={agentItem.participant_id} className="flex items-center gap-2 px-4 py-1">
                  <Avatar src={agentItem.avatar_url ?? undefined} alt={agentItem.display_name} size="xs" />
                  <span className="text-sm text-secondary">{agentItem.display_name} is thinking...</span>
                  <LoadingIndicator size="sm" />
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 px-4 py-1">
                <span className="text-sm text-secondary">{processingAgents.length} agents are thinking...</span>
                <LoadingIndicator size="sm" />
              </div>
            )}
          </div>
        )}

        {/* Unified agent response bubble: dots -> processing state -> streaming text */}
        {/* All three states render in this same DOM location for seamless in-place transitions */}
        {(() => {
          const agentName = conversation?.agent_name ?? 'Agent'
          const agentAvatar = conversation?.agent_avatar

          // State 1: Processing state (before any tokens)
          if (processingState && !isStreaming) {
            return (
              <Message
                type="message"
                senderName={agentName}
                senderAvatar={agentAvatar}
                timestamp=""
                content={getProcessingText(processingState, userLang)}
                stateLabel={isCancelling ? 'cancelando...' : undefined}
                stateTone={isCancelling ? 'canceling' : undefined}
                statePulse={isCancelling}
                sent={false}
                className="[&_p]:text-sm [&_p]:italic [&_p]:text-tertiary"
              />
            )
          }

          // State 2: Streaming — check for text or show dots
          if (isStreaming && streamingMessageId) {
            const text = streamingMessages.get(streamingMessageId)
            if (text && text.length > 0) {
              // If the placeholder INSERT is already in the messages list, the
              // .map() loop applies the streamingMessages override (line 304) —
              // rendering a separate bubble here would duplicate the message.
              const alreadyInList = chat.messages.some(m => m.message_id === streamingMessageId)
              if (!alreadyInList) {
                // Rare race: UPDATE arrived before INSERT — render standalone
                return (
                  <Message
                    type="message"
                    senderName={agentName}
                    senderAvatar={agentAvatar}
                    timestamp=""
                    content={text}
                    stateLabel={isCancelling ? 'cancelando...' : undefined}
                    stateTone={isCancelling ? 'canceling' : undefined}
                    statePulse={isCancelling}
                    sent={false}
                  />
                )
              }
              return null
            }
            // streamingMessageId set but no text yet — show animated dots
            if (isCancelling) {
              return (
                <Message
                  type="message"
                  senderName={agentName}
                  senderAvatar={agentAvatar}
                  timestamp=""
                  content="Pausando respuesta..."
                  stateLabel="cancelando..."
                  stateTone="canceling"
                  statePulse
                  sent={false}
                />
              )
            }
            return (
              <Message
                type="writing"
                senderName={agentName}
                senderAvatar={agentAvatar}
                timestamp=""
              />
            )
          }

          // State 3: Waiting for reply — show dots once the agent has received
          // the message (delivered or read). Before delivery, the single-check
          // "sent" indicator is enough feedback; dots mean "agent is thinking".
          if (waitingForReply) {
            const latestUserMsg = [...chat.messages].reverse().find(m => m.isMine && !m._failed)
            const agentReceived = latestUserMsg?.statusIcon === 'delivered' || latestUserMsg?.statusIcon === 'read'
            if (agentReceived) {
              if (isCancelling) {
                return (
                  <Message
                    type="message"
                    senderName={agentName}
                    senderAvatar={agentAvatar}
                    timestamp=""
                    content="Pausando respuesta..."
                    stateLabel="cancelando..."
                    stateTone="canceling"
                    statePulse
                    sent={false}
                  />
                )
              }
              return (
                <Message
                  type="writing"
                  senderName={agentName}
                  senderAvatar={agentAvatar}
                  timestamp=""
                />
              )
            }
            return null
          }

          return null
        })()}
      </div>

      {/* Footer input */}
      <div className="shrink-0 px-4 pb-4">
        {isAnnouncement && <AnnouncementNotice />}
        <ChatInput
          type="advanced"
          onSend={handleSendWithPreview}
          isStreaming={isStreaming}
          showAbortControl={isGenerationActive}
          isAbortPending={isCancelling}
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
          mentionableAgents={mentionableAgents}
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
  refetch,
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
    return <ConversationView conversationId={activeConversationId} conversation={conversation} refetch={refetch} />
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      <p className="text-sm font-semibold text-primary">Select a conversation</p>
      <p className="text-sm text-tertiary">Choose from your channels or direct messages to start chatting.</p>
    </div>
  )
}
