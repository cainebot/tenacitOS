// lib/chat.ts — Client-side API helpers for chat system
// Used by useDirectConversation and useAgentChat hooks
import type {
  ConversationType,
  MessageAttachmentRow,
  MessageRow,
} from '@/types/chat'

export type SendMessagePayload = {
  text: string
  content_type?: string
  parent_message_id?: string
  skill_id?: string
  skill_command?: string
}

export type PersistedMessageAttachment = Pick<
  MessageAttachmentRow,
  'message_id' | 'storage_path' | 'url' | 'filename' | 'size_bytes' | 'mime_type'
> &
  Partial<
    Pick<
      MessageAttachmentRow,
      | 'attachment_id'
      | 'duration_seconds'
      | 'width_px'
      | 'height_px'
      | 'thumbnail_storage_path'
      | 'metadata'
      | 'created_at'
    >
  >

export type SendMessageResponse = MessageRow & {
  attachments?: PersistedMessageAttachment[]
}

/** Get or create a direct conversation between current user and an agent */
export async function getOrCreateDirectConversation(
  agentParticipantId: string
): Promise<string> {
  const res = await fetch('/api/conversations/direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentParticipantId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || `Failed to get conversation (${res.status})`)
  }
  const data = await res.json()
  return data.conversation_id
}

/** Fetch paginated messages for a conversation */
export async function fetchMessages(
  conversationId: string,
  cursor?: string,
  limit = 30
): Promise<{ data: unknown[]; next_cursor: string | null }> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)

  const res = await fetch(
    `/api/conversations/${conversationId}/messages?${params}`
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || `Failed to fetch messages (${res.status})`)
  }
  return res.json()
}

/** Fetch a single message by ID with JOINed attachments + signed URLs */
export async function fetchSingleMessage(
  conversationId: string,
  messageId: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `/api/conversations/${conversationId}/messages/${messageId}`
  )
  if (!res.ok) return null
  const { data } = await res.json()
  return data ?? null
}

/** Send a message in a conversation */
export async function sendMessage(
  conversationId: string,
  payload: SendMessagePayload
): Promise<SendMessageResponse> {
  const res = await fetch(
    `/api/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || `Failed to send message (${res.status})`)
  }
  return res.json()
}

/** Send a message with file/image/audio attachments (multipart/form-data) */
export async function sendMessageWithAttachments(
  conversationId: string,
  payload: {
    text: string
    files: File[]
    parent_message_id?: string
    /** T-99-05: Normalized frequency bars [0..1] captured from AnalyserNode during recording */
    waveformData?: number[]
  }
): Promise<SendMessageResponse> {
  const form = new FormData()
  form.append('text', payload.text)
  if (payload.parent_message_id) {
    form.append('parent_message_id', payload.parent_message_id)
  }
  // T-99-05: Persist waveform snapshot as JSON metadata for the first audio attachment
  if (payload.waveformData && payload.waveformData.length > 0) {
    form.append('attachment_metadata', JSON.stringify({ waveform: payload.waveformData }))
  }
  for (const file of payload.files) {
    form.append('files', file, file.name)
  }

  const res = await fetch(
    `/api/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: form,
      // No Content-Type header — browser sets multipart boundary automatically
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || `Failed to send message (${res.status})`)
  }
  return res.json()
}

/** Toggle (add or remove) an emoji reaction on a message */
export async function toggleReactionApi(
  conversationId: string,
  messageId: string,
  emoji: string,
  isRemoving: boolean
): Promise<void> {
  const res = await fetch(
    `/api/conversations/${conversationId}/messages/${messageId}/reactions`,
    {
      method: isRemoving ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    }
  )
  if (!res.ok && res.status !== 409 && res.status !== 204) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || `Reaction failed (${res.status})`)
  }
}

/** Regex to detect HTTP/HTTPS URLs in message text */
export const URL_REGEX = /https?:\/\/[^\s]+/

/** Map DB conversation_type to UI display type */
export function conversationUiType(type: ConversationType): 'announcement' | 'channel' | 'dm' {
  if (type === 'broadcast') return 'announcement'
  if (type === 'group') return 'channel'
  return 'dm'
}

/** Create a new group channel conversation */
export async function createChannel(
  name: string,
  memberParticipantIds: string[]
): Promise<string> {
  const res = await fetch('/api/conversations/channel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, memberParticipantIds }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || `Failed to create channel (${res.status})`)
  }
  const data = await res.json()
  return data.conversation_id
}

/** Create a new broadcast (announcement) */
export async function createBroadcast(
  channelId: string,
  text: string
): Promise<{ conversation_id: string; broadcast_id: string }> {
  const res = await fetch('/api/broadcasts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel_id: channelId, text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || `Failed to create broadcast (${res.status})`)
  }
  return res.json()
}
