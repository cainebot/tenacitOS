'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Message, type MessageProps } from '@/components/application/message'
import { AgentPanelSection, AgentPanelDivider } from '@/components/application/agent-panel'
import { useDirectConversation } from '@/hooks/use-direct-conversation'
import { useAgentChat } from '@/hooks/use-agent-chat'
import { useMyParticipant } from '@/contexts/my-participant-context'
import { useAgentSkills } from '@/hooks/use-agent-skills'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import { useChatSend } from '@/features/chat/hooks/use-chat-send'
import type { EnrichedMessage, MessageAttachmentRow } from '@/types/chat'
import type { MessageAction } from '@/components/application/message-action-panel'
import type { MessageStatus } from '@/components/application/message-status-icon'
import { ChatInput, type ChatInputPayload } from '@/components/application/chat-input'
import { formatBytes } from '@/lib/format'

// ── Props ─────────────────────────────────────────────────────────────────────

interface AgentChatTabProps {
  agentId: string
  agentParticipantId: string
  agentName: string
  agentAvatar?: string
  /** User avatar for ChatInput display */
  userAvatarSrc?: string
  /** User display name for ChatInput */
  userName?: string
  onSendRef: React.MutableRefObject<((payload: ChatInputPayload) => void) | null>
}

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

function hasReadReceipt(msg: EnrichedMessage): boolean {
  return msg.receipts.some((r) => r.status === 'read')
}

function extname(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx > 0 ? filename.substring(idx) : ''
}

const VIDEO_THUMBNAIL_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" fill="%23525866"><rect width="320" height="180" rx="8"/><text x="160" y="98" text-anchor="middle" fill="%23999" font-size="14">Video</text></svg>'
)

function getAbortBubbleMeta(msg: EnrichedMessage): {
  stateLabel?: string
  stateTone?: 'canceling' | 'canceled'
  statePulse?: boolean
} {
  if (msg._abortState === 'canceling') {
    return {
      stateLabel: 'cancelando...',
      stateTone: 'canceling',
      statePulse: true,
    }
  }
  if (msg._abortState === 'canceled') {
    return {
      stateLabel: 'Respuesta cancelada',
      stateTone: 'canceled',
    }
  }
  return {}
}

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
  const abortBubbleMeta = getAbortBubbleMeta(msg)

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
          ...abortBubbleMeta,
        }
      }
      return {
        ...baseProps,
        type: 'message',
        content: msg.text ?? '',
        ...abortBubbleMeta,
      }
    }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AgentChatTab({
  agentId,
  agentParticipantId,
  agentName,
  agentAvatar,
  userAvatarSrc,
  userName = 'You',
  onSendRef,
}: AgentChatTabProps) {
  const { conversationId, loading: conversationLoading } = useDirectConversation(agentParticipantId)
  const { participant } = useMyParticipant()
  const myParticipantId = participant?.participant_id ?? ''

  const chat = useAgentChat({ conversationId, recipientIds: [agentParticipantId] })

  // Mark all unread messages as read when this side-panel chat opens. Covers
  // older messages outside the 30-message window that the viewport observer
  // below cannot reach.
  useEffect(() => {
    if (!conversationId || !myParticipantId) return
    let cancelled = false
    void (async () => {
      try {
        await fetch(`/api/conversations/${conversationId}/receipts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mark_all_unread: true,
            participant_id: myParticipantId,
            status: 'read',
          }),
        })
      } catch {
        // best-effort
      }
      if (cancelled) return
    })()
    return () => { cancelled = true }
  }, [conversationId, myParticipantId])
  const isGenerationActive = chat.waitingForReply || !!chat.processingState || chat.isStreaming
  const { shortcuts } = useAgentSkills(agentId)

  const { agents } = useRealtimeAgents()
  const agent = agents.find((a) => a.agent_id === agentId)
  const isAgentTyping = agent?.status === 'thinking'

  // ── Send adapter (D-05/D-12) — files, audio, skills, reply threading ─────
  const { handleSend, replyToMessage, setReplyTo, clearReply } = useChatSend({
    conversationId,
    sendMessage: chat.sendMessage,
    shortcuts,
  })

  // ── Send ref pattern: write handleSend to onSendRef so parent can call it ──
  useEffect(() => {
    onSendRef.current = handleSend
    return () => {
      onSendRef.current = null
    }
  }, [handleSend, onSendRef])

  // ── Scroll management (ported from chat-view-panel, per D-02/D-03/D-04) ──
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasInitialScrolled = useRef(false)
  const prevMessageCountRef = useRef(0)

  // ── Infinite scroll sentinel ──────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollObserverRef = useRef<IntersectionObserver | null>(null)

  // Reset scroll state when switching conversations
  useEffect(() => {
    hasInitialScrolled.current = false
    prevMessageCountRef.current = 0
  }, [conversationId])

  // D-04: Initial load always scrolls to bottom (once per conversation)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (!hasInitialScrolled.current && chat.messages.length > 0 && !chat.loading) {
      el.scrollTop = el.scrollHeight
      hasInitialScrolled.current = true
    }
  }, [chat.messages.length, chat.loading])

  // D-03: Auto-scroll on new messages only if within 150px of bottom
  // (skip for loadMore which prepends older messages)
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !hasInitialScrolled.current) return
    if (chat.messages.length > prevMessageCountRef.current && prevMessageCountRef.current > 0) {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight
      if (gap < 150) {
        el.scrollTop = el.scrollHeight
      }
    }
    prevMessageCountRef.current = chat.messages.length
  }, [chat.messages.length])

  // Sentinel — loadMore ONLY after initial scroll completed, otherwise the
  // sentinel sits at the viewport on mount and fires a runaway chain.
  useEffect(() => {
    if (!sentinelRef.current) return

    scrollObserverRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && chat.hasMore && hasInitialScrolled.current) {
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

  // ── Viewport-based read receipts (1-second debounce per message) ──────────
  const readObserverRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const pendingReads = new Map<string, NodeJS.Timeout>()

    readObserverRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const messageId = (entry.target as HTMLElement).dataset.messageId
          if (!messageId) continue

          if (entry.isIntersecting) {
            if (!pendingReads.has(messageId)) {
              const timer = setTimeout(() => {
                chat.markMessagesRead([messageId])
                pendingReads.delete(messageId)
              }, 1000)
              pendingReads.set(messageId, timer)
            }
          } else {
            const timer = pendingReads.get(messageId)
            if (timer) {
              clearTimeout(timer)
              pendingReads.delete(messageId)
            }
          }
        }
      },
      { threshold: 0.5 }
    )

    return () => {
      readObserverRef.current?.disconnect()
      for (const timer of pendingReads.values()) {
        clearTimeout(timer)
      }
      pendingReads.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.markMessagesRead])

  // ── Auto-scroll when typing indicator appears (uses owned scrollRef) ──────
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !hasInitialScrolled.current) return
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight
    if (gap < 150) {
      el.scrollTop = el.scrollHeight
    }
  }, [isAgentTyping])

  // ── Loading state ─────────────────────────────────────────────────────────
  const isLoading = conversationLoading || chat.loading

  if (isLoading) {
    return (
      <div className="flex h-full flex-col min-h-0">
        <div className="flex flex-1 items-center justify-center py-8">
          <p className="text-sm text-tertiary">Loading messages...</p>
        </div>
      </div>
    )
  }

  // ── Group messages by date ────────────────────────────────────────────────
  const groups: Map<string, { label: string; messages: EnrichedMessage[] }> = new Map()

  for (const msg of chat.messages) {
    const key = getDateKey(msg.created_at)
    if (!groups.has(key)) {
      groups.set(key, { label: formatDate(msg.created_at), messages: [] })
    }
    groups.get(key)!.messages.push(msg)
  }

  const isEmpty = chat.messages.length === 0 && !isAgentTyping

  return (
    <div className="flex h-full flex-col min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-6 pb-6"
      >
        <div className="flex flex-col gap-4 w-full">
      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <p className="text-sm text-tertiary text-center px-4">
            Send a message to start chatting with {agentName}
          </p>
        </div>
      ) : (
        <>
          {/* Infinite scroll sentinel — top sentinel triggers loadMore when scrolled up */}
          <div ref={sentinelRef} className="h-1 shrink-0" />

          {Array.from(groups.entries()).map(([dateKey, group]) => (
            <div key={dateKey} className="flex flex-col gap-4 w-full">
              <AgentPanelDivider label={group.label} />
              <AgentPanelSection>
                {group.messages.map((msg) => {
                  const isAgentMessage = !msg.isMine
                  const shouldObserveForRead =
                    isAgentMessage && !hasReadReceipt(msg) && !msg._failed

                  return (
                    <div
                      key={msg.message_id}
                      data-message-id={shouldObserveForRead ? msg.message_id : undefined}
                      ref={(el) => {
                        if (el && shouldObserveForRead && readObserverRef.current) {
                          readObserverRef.current.observe(el)
                        }
                      }}
                    >
                      {(() => {
                        const baseProps = {
                          sent: msg.isMine,
                          senderName: msg.senderName,
                          senderAvatar: msg.senderAvatar ?? undefined,
                          timestamp: formatTime(msg.created_at),
                          status: msg.isMine ? msg.statusIcon : undefined,
                          reactions: msg.reactions.map((r) => ({
                            emoji: r.emoji,
                            count: r.count,
                            isSelected: r.selected,
                            onPress: () => chat.toggleReaction(msg.message_id, r.emoji),
                          })),
                          actions: (() => {
                            if (msg._failed) return ['retry'] as MessageAction[]
                            if (msg.messageType === 'writing') return undefined
                            switch (msg.messageType) {
                              case 'file':
                              case 'image':
                              case 'audio':
                              case 'video':
                                return ['reply'] as MessageAction[]
                              case 'link-preview':
                              case 'link-minimal':
                                return ['copy', 'reply'] as MessageAction[]
                              case 'message':
                              case 'message-reply':
                              default:
                                return msg.isMine
                                  ? (['copy'] as MessageAction[])
                                  : (['copy', 'reply'] as MessageAction[])
                            }
                          })(),
                          onAction: (action: MessageAction) => {
                            switch (action) {
                              case 'retry':
                                chat.retryMessage(msg.message_id)
                                break
                              case 'copy':
                                navigator.clipboard.writeText(msg.text ?? '').then(() => {
                                  toast.success('Copied to clipboard')
                                }).catch(() => {
                                  toast.error('Failed to copy')
                                })
                                break
                              case 'reply':
                                setReplyTo(msg)
                                break
                            }
                          },
                          onReact: (emoji: string) => chat.toggleReaction(msg.message_id, emoji),
                        }
                        const messageProps = buildMessageProps(msg, baseProps, chat.messages)
                        return <Message {...messageProps} />
                      })()}
                    </div>
                  )
                })}
              </AgentPanelSection>
            </div>
          ))}

          {/* Typing indicator — shown when agent.status === 'thinking' (D-11) */}
          {isAgentTyping && (
            <Message
              type="writing"
              senderName={agentName}
              senderAvatar={agentAvatar}
              timestamp=""
            />
          )}
        </>
      )}
        </div>
      </div>

      {/* Chat input — pinned outside scroll region so it stays visible */}
      <div className="shrink-0 px-5 pb-4">
        <ChatInput
          type="advanced"
          avatarSrc={userAvatarSrc}
          userName={userName}
          onSend={handleSend}
          isStreaming={chat.isStreaming}
          showAbortControl={isGenerationActive}
          isAbortPending={chat.isCancelling}
          onAbort={() => { void chat.abortStream() }}
          shortcuts={shortcuts}
          replyTo={replyToMessage ? {
            senderName: replyToMessage.senderName,
            text: replyToMessage.text
              ? (replyToMessage.text.length > 100
                  ? replyToMessage.text.substring(0, 100) + '...'
                  : replyToMessage.text)
              : ''
          } : undefined}
          onClearReply={clearReply}
        />
      </div>
    </div>
  )
}
