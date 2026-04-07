// types/chat.ts — Phase 88: Agent Chat System types
// Source: docs/AGENT-CHAT-ARCHITECTURE.md Appendix C
// Note: MessageRow includes og_site_name, og_url, system_event to match 30-chat-core.sql messages table
// Note: MessageAttachmentRow includes thumbnail_storage_path to match 30-chat-core.sql message_attachments table
// Note: MessageReceiptRow includes error_code to match 30-chat-core.sql message_receipts table

export type ContentType = 'text' | 'file' | 'audio' | 'video' | 'image' | 'link' | 'system' | 'skill_invocation'
export type ParticipantType = 'human' | 'agent'
export type ParticipantRole = 'admin' | 'operator' | 'viewer' | 'agent'
export type ParticipationRole = 'owner' | 'member' | 'readonly'
export type ConversationType = 'direct' | 'broadcast' | 'group'
export type ReceiptStatus = 'delivered' | 'read' | 'processed' | 'failed'

export interface ChatParticipantRow {
  participant_id: string
  participant_type: ParticipantType
  external_id: string
  display_name: string
  avatar_url: string | null
  role: ParticipantRole
  created_at: string
}

export interface ConversationRow {
  conversation_id: string
  conversation_type: ConversationType
  context_type: string | null
  context_id: string | null
  title: string | null
  topic: string | null
  last_message_at: string | null
  created_at: string
}

export interface MessageRow {
  message_id: string
  conversation_id: string
  sender_id: string
  content_type: ContentType
  text: string | null
  parent_message_id: string | null
  skill_id: string | null
  skill_command: string | null
  og_title: string | null
  og_description: string | null
  og_image_url: string | null
  og_site_name: string | null
  og_url: string | null
  system_event: string | null
  broadcast_id: string | null
  deleted_at: string | null
  created_at: string
  edited_at: string | null
}

export interface MessageAttachmentRow {
  attachment_id: string
  message_id: string
  storage_path: string
  url: string
  filename: string
  size_bytes: number
  mime_type: string
  duration_seconds: number | null
  width_px: number | null
  height_px: number | null
  thumbnail_storage_path: string | null
  created_at: string
}

export interface MessageReceiptRow {
  receipt_id: string
  message_id: string
  conversation_id: string
  participant_id: string
  status: ReceiptStatus
  error_message: string | null
  error_code: string | null
  created_at: string
}

export interface MessageReactionRow {
  reaction_id: string
  message_id: string
  conversation_id: string
  participant_id: string
  emoji: string
  created_at: string
}

export interface ReactionData {
  emoji: string
  count: number
  selected: boolean
}

export const CONTENT_TYPE_TO_MESSAGE_TYPE: Record<ContentType, string> = {
  text: 'message',
  file: 'file',
  audio: 'audio',
  video: 'video',
  image: 'image',
  link: 'link-preview',
  system: 'message',
  skill_invocation: 'message',
}

// ── Phase 89: Enriched message types + utility functions ─────────────────────

export type { MessageStatus } from '@/components/application/message-status-icon'
export type { MessageType } from '@/components/application/message'

import type { MessageStatus } from '@/components/application/message-status-icon'

export interface EnrichedMessage {
  message_id: string
  conversation_id: string
  sender_id: string
  content_type: ContentType
  text: string | null
  created_at: string
  edited_at: string | null
  parent_message_id: string | null
  deleted_at: string | null
  // OG link preview fields
  og_title: string | null
  og_description: string | null
  og_image_url: string | null
  og_site_name: string | null
  og_url: string | null
  // Skill invocation
  skill_id: string | null
  skill_command: string | null
  // Joined
  senderName: string
  senderAvatar: string | null
  isMine: boolean
  attachments: MessageAttachmentRow[]
  receipts: MessageReceiptRow[]
  reactions: ReactionData[]
  parentMessage: { text: string | null; senderName: string } | null
  // Derived
  statusIcon: MessageStatus
  messageType: string  // from CONTENT_TYPE_TO_MESSAGE_TYPE
  // Optimistic state
  _optimistic?: boolean
  _failed?: boolean
}

export function deriveStatusIcon(
  receipts: MessageReceiptRow[],
  recipientIds: string[]
): MessageStatus {
  if (receipts.some(r => r.status === 'failed')) return 'failed'

  for (const recipientId of recipientIds) {
    const recipientReceipts = receipts.filter(r => r.participant_id === recipientId)
    const statuses = new Set(recipientReceipts.map(r => r.status))

    if (statuses.has('processed')) continue
    if (statuses.has('read')) continue
    if (statuses.has('delivered')) return 'delivered'
    return 'sent'
  }

  return 'read'
}

export function groupReactions(
  reactions: MessageReactionRow[],
  myParticipantId: string
): ReactionData[] {
  const map = new Map<string, { count: number; selected: boolean }>()
  for (const r of reactions) {
    const entry = map.get(r.emoji) ?? { count: 0, selected: false }
    entry.count++
    if (r.participant_id === myParticipantId) entry.selected = true
    map.set(r.emoji, entry)
  }
  return Array.from(map, ([emoji, { count, selected }]) => ({ emoji, count, selected }))
}
