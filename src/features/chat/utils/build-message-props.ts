// Extracted from chat-workspace.tsx — shared message rendering utility

import type { EnrichedMessage, MessageAttachmentRow } from '@/types/chat'
import type { MessageProps } from '@/components/application/message'
import type { MessageAction } from '@/components/application/message-action-panel'
import type { MessageStatus } from '@/components/application/message-status-icon'
import { formatBytes } from '@/lib/format'

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoString))
}

export function formatDate(isoString: string): string {
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

export function getDateKey(isoString: string): string {
  const date = new Date(isoString)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function extname(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx > 0 ? filename.substring(idx) : ''
}

export const VIDEO_THUMBNAIL_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" fill="%23525866"><rect width="320" height="180" rx="8"/><text x="160" y="98" text-anchor="middle" fill="%23999" font-size="14">Video</text></svg>'
)

// ── Main ─────────────────────────────────────────────────────────────────────

export function buildMessageProps(
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
        caption: msg.text || undefined,
        attachmentId: att?.attachment_id,
        createdAt: msg.created_at,
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
