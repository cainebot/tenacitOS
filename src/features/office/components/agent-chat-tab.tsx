'use client'

import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Message, type MessageProps } from '@/components/application/message'
import { AgentPanelSection, AgentPanelDivider } from '@/components/application/agent-panel'
import { useDirectConversation } from '@/hooks/use-direct-conversation'
import { useAgentChat } from '@/hooks/use-agent-chat'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import type { EnrichedMessage, MessageAttachmentRow } from '@/types/chat'
import type { MessageAction } from '@/components/application/message-action-panel'
import type { MessageStatus } from '@/components/application/message-status-icon'
import type { ChatInputPayload } from '@/components/application/chat-input'
import { sendMessageWithAttachments } from '@/lib/chat'
import { formatBytes } from '@/lib/format'

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
    reactions: { emoji: string; count: number; isSelected: boolean }[]
    actions?: MessageAction[]
    onAction?: (action: MessageAction) => void
  }
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

    default:
      return {
        ...baseProps,
        type: 'message',
        content: msg.text ?? '',
      }
  }
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
      if (!conversationId) return

      // Collect all files: images + non-image files + audio blob
      const allFiles: File[] = [
        ...payload.images,
        ...(payload.files ?? []),
      ]

      // Convert audioBlob to File if present (D-05)
      if (payload.audioBlob) {
        const ext = payload.audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
        const audioFile = new File(
          [payload.audioBlob],
          `recording-${Date.now()}.${ext}`,
          { type: payload.audioBlob.type }
        )
        allFiles.push(audioFile)
      }

      // Route: multipart (files) or text-only (JSON)
      if (allFiles.length > 0) {
        try {
          await sendMessageWithAttachments(conversationId, {
            text: payload.text,
            files: allFiles,
          })
        } catch {
          toast.error('Failed to send attachment')
        }
      } else if (payload.text.trim()) {
        // Text-only path. D-06 URL detection + link-preview firing is handled
        // in use-agent-chat.ts Realtime INSERT handler, not here.
        await chat.sendMessage({ text: payload.text })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, chat.sendMessage]
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
                      })),
                      actions: msg._failed ? (['retry'] as MessageAction[]) : undefined,
                      onAction: (action: MessageAction) => {
                        if (action === 'retry') {
                          chat.retryMessage(msg.message_id)
                        }
                      },
                    }
                    const messageProps = buildMessageProps(msg, baseProps)
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
    </div>
  )
}
