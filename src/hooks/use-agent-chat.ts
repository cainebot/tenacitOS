'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase'
import {
  fetchMessages as fetchMessagesApi,
  sendMessage as sendMessageApi,
} from '@/lib/chat'
import {
  deriveStatusIcon,
  groupReactions,
  CONTENT_TYPE_TO_MESSAGE_TYPE,
  type EnrichedMessage,
  type MessageAttachmentRow,
  type MessageReceiptRow,
  type MessageReactionRow,
  type ContentType,
} from '@/types/chat'
import { useMyParticipant } from '@/contexts/my-participant-context'

interface UseAgentChatOptions {
  conversationId: string | null
  agentParticipantId: string
}

interface UseAgentChatResult {
  messages: EnrichedMessage[]
  loading: boolean
  error: string | null
  sendMessage: (payload: { text: string; content_type?: string }) => Promise<void>
  retryMessage: (messageId: string) => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
  markMessagesRead: (messageIds: string[]) => Promise<void>
}

// ── Raw API message shape (joined rows from API) ──────────────────────────────

interface RawApiMessage {
  message_id: string
  conversation_id: string
  sender_id: string
  content_type: ContentType
  text: string | null
  created_at: string
  edited_at: string | null
  parent_message_id: string | null
  deleted_at: string | null
  og_title: string | null
  og_description: string | null
  og_image_url: string | null
  og_site_name: string | null
  og_url: string | null
  skill_id: string | null
  skill_command: string | null
  sender?: { display_name: string; avatar_url: string | null }
  attachments?: MessageAttachmentRow[]
  receipts?: MessageReceiptRow[]
  reactions?: MessageReactionRow[]
}

// ── enrichMessage helper ──────────────────────────────────────────────────────

function enrichMessage(
  msg: RawApiMessage,
  myParticipantId: string,
  recipientIds: string[]
): EnrichedMessage {
  const isMine = msg.sender_id === myParticipantId
  const receipts = msg.receipts ?? []
  const reactions = msg.reactions ?? []

  return {
    message_id: msg.message_id,
    conversation_id: msg.conversation_id,
    sender_id: msg.sender_id,
    content_type: msg.content_type,
    text: msg.text,
    created_at: msg.created_at,
    edited_at: msg.edited_at,
    parent_message_id: msg.parent_message_id,
    deleted_at: msg.deleted_at,
    og_title: msg.og_title,
    og_description: msg.og_description,
    og_image_url: msg.og_image_url,
    og_site_name: msg.og_site_name,
    og_url: msg.og_url,
    skill_id: msg.skill_id,
    skill_command: msg.skill_command,
    senderName: msg.sender?.display_name ?? 'Unknown',
    senderAvatar: msg.sender?.avatar_url ?? null,
    isMine,
    attachments: msg.attachments ?? [],
    receipts,
    reactions: groupReactions(reactions, myParticipantId),
    parentMessage: null, // reply threading deferred
    statusIcon: isMine ? deriveStatusIcon(receipts, recipientIds) : 'read',
    messageType: CONTENT_TYPE_TO_MESSAGE_TYPE[msg.content_type] ?? 'message',
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAgentChat({
  conversationId,
  agentParticipantId,
}: UseAgentChatOptions): UseAgentChatResult {
  const { participant } = useMyParticipant()
  const myParticipantId = participant?.participant_id ?? ''

  const [messages, setMessages] = useState<EnrichedMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const cursorRef = useRef<string | null>(null)
  const recipientIds = agentParticipantId ? [agentParticipantId] : []

  // ── Initial fetch ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!conversationId || !myParticipantId) return

    let cancelled = false
    setLoading(true)
    setError(null)
    cursorRef.current = null

    fetchMessagesApi(conversationId)
      .then(({ data, next_cursor }) => {
        if (cancelled) return
        const raw = data as RawApiMessage[]
        // API returns newest-first; reverse for ascending display (oldest at top)
        const enriched = raw
          .reverse()
          .map((msg) => enrichMessage(msg, myParticipantId, recipientIds))
        setMessages(enriched)
        cursorRef.current = next_cursor
        setHasMore(next_cursor !== null)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load messages')
        setLoading(false)
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, myParticipantId])

  // ── Infinite scroll — load older messages ─────────────────────────────────

  const loadMore = useCallback(async () => {
    if (!conversationId || !cursorRef.current || !myParticipantId) return

    try {
      const { data, next_cursor } = await fetchMessagesApi(
        conversationId,
        cursorRef.current
      )
      const raw = data as RawApiMessage[]
      const older = raw
        .reverse()
        .map((msg) => enrichMessage(msg, myParticipantId, recipientIds))
      setMessages((prev) => [...older, ...prev])
      cursorRef.current = next_cursor
      setHasMore(next_cursor !== null)
    } catch {
      // silently fail on load-more; user can retry by scrolling
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, myParticipantId])

  // ── Optimistic send ────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (payload: { text: string; content_type?: string }) => {
      if (!conversationId || !myParticipantId) return

      const optimisticId = crypto.randomUUID()
      const now = new Date().toISOString()

      // Build optimistic message (D-08)
      const optimistic: EnrichedMessage = {
        message_id: optimisticId,
        conversation_id: conversationId,
        sender_id: myParticipantId,
        content_type: (payload.content_type as ContentType) ?? 'text',
        text: payload.text,
        created_at: now,
        edited_at: null,
        parent_message_id: null,
        deleted_at: null,
        og_title: null,
        og_description: null,
        og_image_url: null,
        og_site_name: null,
        og_url: null,
        skill_id: null,
        skill_command: null,
        senderName: participant?.display_name ?? 'Me',
        senderAvatar: participant?.avatar_url ?? null,
        isMine: true,
        attachments: [],
        receipts: [],
        reactions: [],
        parentMessage: null,
        statusIcon: 'sent',
        messageType: CONTENT_TYPE_TO_MESSAGE_TYPE[(payload.content_type as ContentType) ?? 'text'] ?? 'message',
        _optimistic: true,
      }

      // Append optimistic message immediately
      setMessages((prev) => [...prev, optimistic])

      try {
        await sendMessageApi(conversationId, payload)
        // Realtime INSERT will arrive and replace the optimistic message via dedup
      } catch (err) {
        // Mark optimistic message as failed (D-08)
        setMessages((prev) =>
          prev.map((m) =>
            m.message_id === optimisticId
              ? { ...m, _failed: true, statusIcon: 'failed' }
              : m
          )
        )
        toast.error('Failed to send message')
      }
    },
    [conversationId, myParticipantId, participant]
  )

  // ── Retry failed message ───────────────────────────────────────────────────

  const retryMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) return

      const failed = messages.find((m) => m.message_id === messageId && m._failed)
      if (!failed) return

      // Reset failed state before retrying
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === messageId ? { ...m, _failed: false, statusIcon: 'sent' } : m
        )
      )

      try {
        await sendMessageApi(conversationId, {
          text: failed.text ?? '',
          content_type: failed.content_type,
        })
        // Realtime will deliver the persisted message; optimistic will be deduped
      } catch {
        // Re-mark as failed
        setMessages((prev) =>
          prev.map((m) =>
            m.message_id === messageId
              ? { ...m, _failed: true, statusIcon: 'failed' }
              : m
          )
        )
        toast.error('Failed to send message')
      }
    },
    [conversationId, messages]
  )

  // ── Realtime subscription (D-12) ──────────────────────────────────────────

  useEffect(() => {
    if (!conversationId || !myParticipantId) return

    const supabase = createBrowserClient()

    const channel = supabase
      .channel(`conv-${conversationId}`)
      // messages INSERT — deduplicate optimistic messages by message_id
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const raw = payload.new as RawApiMessage
          setMessages((prev) => {
            // Skip if already present (handles dedup of optimistic messages)
            if (prev.some((m) => m.message_id === raw.message_id && !m._optimistic)) {
              return prev
            }
            const enriched = enrichMessage(raw, myParticipantId, recipientIds)
            // Replace optimistic with real message if same text + mine, else append
            const optimisticIdx = prev.findIndex(
              (m) =>
                m._optimistic &&
                m.isMine &&
                m.text === raw.text &&
                m.sender_id === raw.sender_id
            )
            if (optimisticIdx !== -1) {
              const next = [...prev]
              next[optimisticIdx] = enriched
              return next
            }
            return [...prev, enriched]
          })

          // Insert 'delivered' receipt when an agent message arrives via Realtime.
          // Fire-and-forget — receipt insertion is best-effort, don't block UI.
          if (raw.sender_id !== myParticipantId && conversationId && myParticipantId) {
            supabase.from('message_receipts').upsert({
              message_id: raw.message_id,
              conversation_id: conversationId,
              participant_id: myParticipantId,
              status: 'delivered',
            }, { onConflict: 'message_id,participant_id,status' }).then(() => {})
          }
        }
      )
      // message_receipts INSERT — update receipt + re-derive statusIcon
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_receipts',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const receipt = payload.new as MessageReceiptRow
          setMessages((prev) =>
            prev.map((m) => {
              if (m.message_id !== receipt.message_id) return m
              const updatedReceipts = [...m.receipts, receipt]
              return {
                ...m,
                receipts: updatedReceipts,
                statusIcon: m.isMine
                  ? deriveStatusIcon(updatedReceipts, recipientIds)
                  : m.statusIcon,
              }
            })
          )
        }
      )
      // message_reactions INSERT/DELETE — re-run groupReactions
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const reaction = payload.new as MessageReactionRow
          setMessages((prev) =>
            prev.map((m) => {
              if (m.message_id !== reaction.message_id) return m
              // Reconstruct raw reactions from current ReactionData + new row.
              // ReactionData is aggregated so we approximate from counts.
              const existingRaw = m.reactions.flatMap((rd) =>
                Array.from({ length: rd.count }, (_, i) => ({
                  reaction_id: `${rd.emoji}-${i}`,
                  message_id: m.message_id,
                  conversation_id: conversationId,
                  participant_id: rd.selected && i === 0 ? myParticipantId : `other-${i}`,
                  emoji: rd.emoji,
                  created_at: new Date().toISOString(),
                } as MessageReactionRow))
              )
              const allRaw = [...existingRaw, reaction]
              return { ...m, reactions: groupReactions(allRaw, myParticipantId) }
            })
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deleted = payload.old as Partial<MessageReactionRow>
          setMessages((prev) =>
            prev.map((m) => {
              if (m.message_id !== deleted.message_id) return m
              // Remove one reaction of matching emoji + participant
              const existingRaw = m.reactions.flatMap((rd) =>
                Array.from({ length: rd.count }, (_, i) => ({
                  reaction_id: `${rd.emoji}-${i}`,
                  message_id: m.message_id,
                  conversation_id: conversationId,
                  participant_id: rd.selected && i === 0 ? myParticipantId : `other-${i}`,
                  emoji: rd.emoji,
                  created_at: new Date().toISOString(),
                } as MessageReactionRow))
              )
              const filtered = existingRaw.filter(
                (r) =>
                  !(r.emoji === deleted.emoji && r.participant_id === deleted.participant_id)
              )
              return { ...m, reactions: groupReactions(filtered, myParticipantId) }
            })
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, myParticipantId])

  // ── Batch mark messages as read (viewport-based, called by AgentChatTab) ────

  const markMessagesRead = useCallback(async (messageIds: string[]) => {
    if (!conversationId || !myParticipantId || messageIds.length === 0) return

    const supabase = createBrowserClient()

    // Batch upsert — one receipt row per message
    const receipts = messageIds.map((mid) => ({
      message_id: mid,
      conversation_id: conversationId,
      participant_id: myParticipantId,
      status: 'read' as const,
    }))

    await supabase.from('message_receipts').upsert(receipts, {
      onConflict: 'message_id,participant_id,status',
    }).then(() => {})
  }, [conversationId, myParticipantId])

  return {
    messages,
    loading,
    error,
    sendMessage,
    retryMessage,
    loadMore,
    hasMore,
    markMessagesRead,
  }
}
