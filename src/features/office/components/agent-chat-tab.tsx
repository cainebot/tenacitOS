'use client'

import { useCallback, useEffect, useRef } from 'react'
import { Message, type MessageType } from '@/components/application/message'
import { AgentPanelSection, AgentPanelDivider } from '@/components/application/agent-panel'
import { useDirectConversation } from '@/hooks/use-direct-conversation'
import { useAgentChat } from '@/hooks/use-agent-chat'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import type { EnrichedMessage } from '@/types/chat'
import type { MessageAction } from '@/components/application/message-action-panel'
import type { ChatInputPayload } from '@/components/application/chat-input'

// ── Props ─────────────────────────────────────────────────────────────────────

interface AgentChatTabProps {
  agentId: string
  agentParticipantId: string
  agentName: string
  agentAvatar?: string
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

// ── Component ─────────────────────────────────────────────────────────────────

export function AgentChatTab({
  agentId,
  agentParticipantId,
  agentName,
  agentAvatar,
  onSendRef,
}: AgentChatTabProps) {
  const { conversationId, loading: conversationLoading } = useDirectConversation(agentParticipantId)

  const chat = useAgentChat({ conversationId, agentParticipantId })

  const { agents } = useRealtimeAgents()
  const agent = agents.find((a) => a.agent_id === agentId)
  const isAgentTyping = agent?.status === 'thinking'

  // ── Send ref pattern: write handleSend to onSendRef so parent can call it ──
  const handleSend = useCallback(
    async (payload: ChatInputPayload) => {
      if (!payload.text.trim()) return
      await chat.sendMessage({ text: payload.text })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chat.sendMessage]
  )

  useEffect(() => {
    onSendRef.current = handleSend
    return () => {
      onSendRef.current = null
    }
  }, [handleSend, onSendRef])

  // ── Infinite scroll sentinel ──────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollObserverRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!sentinelRef.current) return

    scrollObserverRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && chat.hasMore) {
            chat.loadMore()
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

  // ── Loading state ─────────────────────────────────────────────────────────
  const isLoading = conversationLoading || chat.loading

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <p className="text-sm text-tertiary">Loading messages...</p>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (chat.messages.length === 0 && !isAgentTyping) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <p className="text-sm text-tertiary text-center px-4">
          Send a message to start chatting with {agentName}
        </p>
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

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Infinite scroll sentinel — top sentinel triggers loadMore when scrolled up */}
      <div ref={sentinelRef} className="h-1" />

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
                  <Message
                    type={msg.messageType as MessageType}
                    sent={msg.isMine}
                    senderName={msg.senderName}
                    senderAvatar={msg.senderAvatar ?? undefined}
                    timestamp={formatTime(msg.created_at)}
                    status={msg.isMine ? msg.statusIcon : undefined}
                    content={msg.text ?? ''}
                    reactions={msg.reactions.map((r) => ({
                      emoji: r.emoji,
                      count: r.count,
                      isSelected: r.selected,
                    }))}
                    actions={msg._failed ? ['retry' as MessageAction] : undefined}
                    onAction={(action: MessageAction) => {
                      if (action === 'retry') {
                        chat.retryMessage(msg.message_id)
                      }
                    }}
                  />
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
    </div>
  )
}
