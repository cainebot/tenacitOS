// lib/chat.ts — Client-side API helpers for chat system
// Used by useDirectConversation and useAgentChat hooks

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

/** Send a message in a conversation */
export async function sendMessage(
  conversationId: string,
  payload: {
    text: string
    content_type?: string
    parent_message_id?: string
    skill_id?: string
    skill_command?: string
  }
): Promise<unknown> {
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
  }
): Promise<unknown> {
  const form = new FormData()
  form.append('text', payload.text)
  if (payload.parent_message_id) {
    form.append('parent_message_id', payload.parent_message_id)
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

/** Regex to detect HTTP/HTTPS URLs in message text */
export const URL_REGEX = /https?:\/\/[^\s]+/
