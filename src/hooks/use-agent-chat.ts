'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase'
import {
  fetchMessages as fetchMessagesApi,
  sendMessage as sendMessageApi,
  toggleReactionApi,
  URL_REGEX,
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
  recipientIds: string[]  // DM: [agentParticipantId], channel: all member IDs, announcement: all agent IDs
}

interface UseAgentChatResult {
  messages: EnrichedMessage[]
  loading: boolean
  error: string | null
  sendMessage: (payload: { text: string; content_type?: string; parent_message_id?: string; skill_id?: string; skill_command?: string }) => Promise<void>
  retryMessage: (messageId: string) => Promise<void>
  toggleReaction: (messageId: string, emoji: string) => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
  markMessagesRead: (messageIds: string[]) => Promise<void>
  /** True after user sends a message, until agent responds or send fails */
  waitingForReply: boolean
  // Phase 102: streaming support
  isStreaming: boolean
  streamingMessageId: string | null
  streamingMessages: Map<string, string>  // message_id -> displayed text
  processingState: string | null          // current processing_state value
  /** Phase 102 D-08/D-09: Sends abort signal to stop active generation */
  abortStream: () => Promise<void>
  /** Phase 102 D-11: Adds optimistic image preview message before upload completes */
  addOptimisticImageMessage: (localUrls: string[], senderName: string, senderAvatar: string | null) => void
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
  processing_state?: string | null  // Phase 102: daemon processing state
  abort_requested?: boolean         // Phase 102: abort signal
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
  recipientIds,
}: UseAgentChatOptions): UseAgentChatResult {
  const { participant } = useMyParticipant()
  const myParticipantId = participant?.participant_id ?? ''

  const [messages, setMessages] = useState<EnrichedMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [waitingForReply, setWaitingForReply] = useState(false)

  const cursorRef = useRef<string | null>(null)
  const isLoadingMoreRef = useRef(false)

  // ── Streaming state (Phase 102) ─────────────────────────────────────────────
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [streamingMessages, setStreamingMessages] = useState<Map<string, string>>(new Map())
  const [processingState, setProcessingState] = useState<string | null>(null)

  // ── Streaming refs (Phase 102 — RAF buffer, no re-renders per token) ─────────
  const streamingBuffersRef = useRef<Map<string, string>>(new Map())
  const rafIdsRef = useRef<Map<string, number>>(new Map())

  // Sender info cache — Realtime INSERT/UPDATE only has raw columns, no joins.
  // Populated from API responses to resolve senderName for Realtime payloads.
  const senderCacheRef = useRef<Map<string, { display_name: string; avatar_url: string | null }>>(new Map())

  // Stable ref for recipientIds — avoids stale closure in Realtime callbacks
  // (the subscription useEffect depends on [conversationId, myParticipantId] only;
  //  recipientIds can change async after the effect runs)
  const recipientIdsRef = useRef(recipientIds)
  recipientIdsRef.current = recipientIds

  // ── Re-derive statusIcon when recipientIds arrives late ───────────────────
  // WorkspaceConversationView loads recipientIds async AFTER the initial fetch.
  // deriveStatusIcon(receipts, []) returns 'sent' — so all messages show single
  // gray check until this effect re-derives with the real recipientIds.
  const recipientIdsKey = recipientIds.join(',')
  useEffect(() => {
    if (recipientIds.length === 0) return
    setMessages((prev) => {
      let changed = false
      const next = prev.map((m) => {
        if (!m.isMine) return m
        const newStatus = deriveStatusIcon(m.receipts, recipientIds)
        if (newStatus === m.statusIcon) return m
        changed = true
        return { ...m, statusIcon: newStatus }
      })
      return changed ? next : prev
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientIdsKey])

  // ── Initial fetch ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!conversationId || !myParticipantId) return

    // Phase 102: Reset streaming state on conversation switch (Pitfall 4)
    setIsStreaming(false)
    setStreamingMessageId(null)
    setStreamingMessages(new Map())
    setProcessingState(null)

    let cancelled = false
    setLoading(true)
    setError(null)
    cursorRef.current = null

    fetchMessagesApi(conversationId)
      .then(({ data, next_cursor }) => {
        if (cancelled) return
        const raw = data as RawApiMessage[]
        // Populate sender cache from joined API data
        for (const m of raw) {
          if (m.sender) senderCacheRef.current.set(m.sender_id, m.sender)
        }
        // API returns newest-first; reverse for ascending display (oldest at top)
        const enriched = raw
          .reverse()
          .map((msg) => enrichMessage(msg, myParticipantId, recipientIdsRef.current))
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
    if (isLoadingMoreRef.current) return  // in-flight guard

    isLoadingMoreRef.current = true
    try {
      const { data, next_cursor } = await fetchMessagesApi(
        conversationId,
        cursorRef.current
      )
      const raw = data as RawApiMessage[]
      for (const m of raw) {
        if (m.sender) senderCacheRef.current.set(m.sender_id, m.sender)
      }
      const older = raw
        .reverse()
        .map((msg) => enrichMessage(msg, myParticipantId, recipientIdsRef.current))
      setMessages((prev) => [...older, ...prev])
      cursorRef.current = next_cursor
      setHasMore(next_cursor !== null)
    } catch {
      // silently fail on load-more; user can retry by scrolling
    } finally {
      isLoadingMoreRef.current = false  // always reset
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, myParticipantId])

  // ── Optimistic send ────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (payload: { text: string; content_type?: string; parent_message_id?: string; skill_id?: string; skill_command?: string }) => {
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
        parent_message_id: payload.parent_message_id ?? null,
        deleted_at: null,
        og_title: null,
        og_description: null,
        og_image_url: null,
        og_site_name: null,
        og_url: null,
        skill_id: payload.skill_id ?? null,
        skill_command: payload.skill_command ?? null,
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

      // Append optimistic message immediately + show typing indicator
      setMessages((prev) => [...prev, optimistic])
      setWaitingForReply(true)

      try {
        await sendMessageApi(conversationId, {
          text: payload.text,
          content_type: payload.content_type,
          ...(payload.parent_message_id ? { parent_message_id: payload.parent_message_id } : {}),
          ...(payload.skill_id ? { skill_id: payload.skill_id } : {}),
          ...(payload.skill_command ? { skill_command: payload.skill_command } : {}),
        })
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
        setWaitingForReply(false)
        toast.error('Failed to send message')
      }
    },
    [conversationId, myParticipantId, participant]
  )

  // ── Phase 102: Local preview URL tracking (D-11, Pitfall 2) ─────────────────
  const localPreviewUrlsRef = useRef<Map<string, string[]>>(new Map()) // message_id -> [objectURLs]

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

  // ── Abort streaming (Phase 102 — D-08, D-09) ─────────────────────────────

  const abortStream = useCallback(async () => {
    if (!streamingMessageId) return

    try {
      const res = await fetch(
        `/api/messages/${streamingMessageId}/abort`,
        { method: 'POST' }
      )
      if (!res.ok) {
        toast.error('Could not stop generation.')
      }
    } catch {
      toast.error('Could not stop generation.')
    }
    // D-10: Don't clean up streaming state here — wait for the daemon's final UPDATE
    // with receipt 'processed' which triggers cleanup in the receipt handler
  }, [streamingMessageId])

  // ── Optimistic image preview (Phase 102 — D-11, D-12) ────────────────────

  const addOptimisticImageMessage = useCallback((
    localUrls: string[],
    senderName: string,
    senderAvatar: string | null,
  ) => {
    const tempId = crypto.randomUUID()
    const localUrlsCopy = [...localUrls]
    localPreviewUrlsRef.current.set(tempId, localUrlsCopy)

    const optimisticAttachments: MessageAttachmentRow[] = localUrlsCopy.map((url, i) => ({
      attachment_id: `local-${tempId}-${i}`,
      message_id: tempId,
      storage_path: '',
      url,
      filename: `image-${i}.jpg`,
      size_bytes: 0,
      mime_type: 'image/jpeg',
      duration_seconds: null,
      width_px: null,
      height_px: null,
      thumbnail_storage_path: null,
      metadata: null,
      created_at: new Date().toISOString(),
    }))

    const optimisticMsg: EnrichedMessage = {
      message_id: tempId,
      conversation_id: conversationId ?? '',
      sender_id: myParticipantId,
      content_type: 'image' as ContentType,
      text: null,
      parent_message_id: null,
      skill_id: null,
      skill_command: null,
      og_title: null,
      og_description: null,
      og_image_url: null,
      og_site_name: null,
      og_url: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      edited_at: null,
      senderName,
      senderAvatar,
      isMine: true,
      attachments: optimisticAttachments,
      receipts: [],
      reactions: [],
      parentMessage: null,
      statusIcon: 'sent',
      messageType: 'image',
      _optimistic: true,
      _isLocalPreview: true,
    }

    setMessages(prev => [...prev, optimisticMsg])
  }, [conversationId, myParticipantId])

  // ── Toggle emoji reaction (optimistic + API + revert on error) ───────────

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!conversationId || !myParticipantId) return

      // Determine if this is an add or remove by checking current selected state
      const message = messages.find((m) => m.message_id === messageId)
      const existing = message?.reactions.find((r) => r.emoji === emoji)
      const isRemoving = existing?.selected === true

      // Apply optimistic update — matches applyOptimisticReaction logic in Wave 0 tests
      setMessages((prev) =>
        prev.map((m) => {
          if (m.message_id !== messageId) return m
          const updated = m.reactions.map((r) => {
            if (r.emoji !== emoji) return r
            return { ...r, count: r.count + (isRemoving ? -1 : 1), selected: !r.selected }
          })
          if (!isRemoving && !m.reactions.some((r) => r.emoji === emoji)) {
            updated.push({ emoji, count: 1, selected: true })
          }
          return { ...m, reactions: updated.filter((r) => r.count > 0) }
        })
      )

      try {
        await toggleReactionApi(conversationId, messageId, emoji, isRemoving)
      } catch {
        // Revert: apply the inverse transformation
        setMessages((prev) =>
          prev.map((m) => {
            if (m.message_id !== messageId) return m
            const reverted = m.reactions.map((r) => {
              if (r.emoji !== emoji) return r
              // Inverse: if we were removing (so we added back +1), now remove again (-1)
              // If we were adding (so we decremented to remove), now add back (+1)
              return { ...r, count: r.count + (isRemoving ? 1 : -1), selected: isRemoving }
            })
            // If we were adding and it was new (count went to 0 after revert), filter it out
            // If count somehow went to 0, remove it
            const filtered = reverted.filter((r) => r.count > 0)
            // If we were adding and no existing reaction existed before, and revert removed it, that's fine
            return { ...m, reactions: filtered }
          })
        )
        toast.error('Failed to update reaction')
      }
    },
    [conversationId, myParticipantId, messages]
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
          // Realtime INSERT lacks JOIN data — resolve sender from cache
          if (!raw.sender && senderCacheRef.current.has(raw.sender_id)) {
            raw.sender = senderCacheRef.current.get(raw.sender_id)!
          }
          // Clear optimistic typing when agent responds
          if (raw.sender_id !== myParticipantId) {
            setWaitingForReply(false)
          }
          setMessages((prev) => {
            // Skip if already present (handles dedup of optimistic messages)
            if (prev.some((m) => m.message_id === raw.message_id && !m._optimistic)) {
              return prev
            }
            const enriched = enrichMessage(raw, myParticipantId, recipientIdsRef.current)
            // Replace optimistic with real message if same text + mine, else append
            const optimisticIdx = prev.findIndex(
              (m) =>
                m._optimistic &&
                m.isMine &&
                m.text === raw.text &&
                m.sender_id === raw.sender_id
            )

            // Phase 102 D-11: Revoke local preview URLs for any _isLocalPreview optimistic messages
            // that are being replaced by the server INSERT (Pitfall 2 prevention)
            const localPreviewMessages = prev.filter(m => m._optimistic && m._isLocalPreview)
            for (const lpm of localPreviewMessages) {
              const urls = localPreviewUrlsRef.current.get(lpm.message_id)
              if (urls) {
                urls.forEach(url => URL.revokeObjectURL(url))
                localPreviewUrlsRef.current.delete(lpm.message_id)
              }
            }

            if (optimisticIdx !== -1) {
              const next = [...prev]
              next[optimisticIdx] = enriched
              return next
            }
            return [...prev, enriched]
          })

          // Delivered receipts handled by agent daemon (message-responder.sh insert_receipt)

          // D-06: Fire link-preview for own messages containing URLs
          if (raw.sender_id === myParticipantId && raw.text && URL_REGEX.test(raw.text) && raw.content_type === 'text') {
            fetch(
              `/api/conversations/${conversationId}/messages/${raw.message_id}/link-preview`,
              { method: 'POST' }
            ).catch(() => {}) // fire-and-forget
          }
        }
      )
      // messages UPDATE — streaming + link-preview (Phase 102 extends D-06 Pitfall 4)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as RawApiMessage
          // Realtime UPDATE lacks JOIN data — resolve sender from cache
          if (!updated.sender && senderCacheRef.current.has(updated.sender_id)) {
            updated.sender = senderCacheRef.current.get(updated.sender_id)!
          }

          const hasPartialText = !!updated.text && updated.text.length > 0
          const hasProcessingState = !!updated.processing_state && updated.processing_state !== 'generating'

          // ── Processing state (no real text yet) per D-05, D-06 ──────────────
          if (hasProcessingState && !hasPartialText) {
            setWaitingForReply(false)
            setProcessingState(updated.processing_state!)
            setStreamingMessageId(updated.message_id)
            return
          }

          // ── Streaming text (real tokens arriving) per D-01, D-02 ────────────
          if (hasPartialText) {
            // Turn off waitingForReply and processing state — user sees real text now (D-03)
            setWaitingForReply(false)
            setProcessingState(null)
            setIsStreaming(true)
            setStreamingMessageId(updated.message_id)

            // Accumulate in buffer ref (zero re-renders per UPDATE)
            streamingBuffersRef.current.set(updated.message_id, updated.text!)

            // Schedule RAF flush only if not already scheduled for this message (D-02, Pitfall 3)
            if (!rafIdsRef.current.has(updated.message_id)) {
              const rafId = requestAnimationFrame(() => {
                rafIdsRef.current.delete(updated.message_id)
                const currentText = streamingBuffersRef.current.get(updated.message_id) ?? ''
                setStreamingMessages(prev => {
                  const next = new Map(prev)
                  next.set(updated.message_id, currentText)
                  return next
                })
              })
              rafIdsRef.current.set(updated.message_id, rafId)
            }
          }

          // ── Link-preview or content_type transition (existing behavior) ──────
          // Only update the full message if it's NOT currently streaming
          if (!hasPartialText || updated.processing_state === undefined) {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.message_id !== updated.message_id) return m
                // Only re-enrich if content_type actually changed (avoid noisy re-renders)
                if (m.content_type === updated.content_type && !updated.og_title) return m
                return enrichMessage(updated, myParticipantId, recipientIdsRef.current)
              })
            )
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
                  ? deriveStatusIcon(updatedReceipts, recipientIdsRef.current)
                  : m.statusIcon,
              }
            })
          )

          // Show error toast when agent reports delivery failure
          if (receipt.status === 'failed' && receipt.error_message) {
            setWaitingForReply(false)
            toast.error(`Agent error: ${receipt.error_message}`)
          }

          // Phase 102: Finalize streaming when receipt transitions to 'processed' or 'failed'
          if (receipt.status === 'processed' || receipt.status === 'failed') {
            // Cancel any pending RAF for this message
            const pendingRaf = rafIdsRef.current.get(receipt.message_id)
            if (pendingRaf !== undefined) {
              cancelAnimationFrame(pendingRaf)
              rafIdsRef.current.delete(receipt.message_id)
            }

            // Get final text from buffer and update the actual message
            const finalText = streamingBuffersRef.current.get(receipt.message_id)
            if (finalText) {
              setMessages(prev => prev.map(m => {
                if (m.message_id !== receipt.message_id) return m
                return { ...m, text: finalText }
              }))
            }

            // Clean up streaming state
            streamingBuffersRef.current.delete(receipt.message_id)
            setStreamingMessages(prev => {
              const next = new Map(prev)
              next.delete(receipt.message_id)
              return next
            })
            setIsStreaming(false)
            setStreamingMessageId(null)
            setProcessingState(null)
          }
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
          setMessages((prev) => {
            // Skip if this is our own reaction and already optimistically applied
            if (reaction.participant_id === myParticipantId) {
              const msg = prev.find((m) => m.message_id === reaction.message_id)
              if (msg) {
                const existing = msg.reactions.find((r) => r.emoji === reaction.emoji)
                if (existing?.selected) return prev // already applied optimistically
              }
            }
            return prev.map((m) => {
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
          })
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
          setMessages((prev) => {
            // Skip if this is our own un-reaction and already optimistically removed
            if (deleted.participant_id === myParticipantId) {
              const msg = prev.find((m) => m.message_id === deleted.message_id)
              if (msg) {
                const existing = msg.reactions.find((r) => r.emoji === deleted.emoji)
                if (!existing || !existing.selected) return prev // already removed optimistically
              }
            }
            return prev.map((m) => {
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
          })
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[realtime] Channel ${conversationId}: ${status}`, err)
        }
      })

    return () => {
      supabase.removeChannel(channel)
      // Phase 102: Cancel all pending RAFs to prevent leaks on conversation switch (Pitfall 1)
      for (const rafId of rafIdsRef.current.values()) {
        cancelAnimationFrame(rafId)
      }
      rafIdsRef.current.clear()
      streamingBuffersRef.current.clear()
      // Phase 102 D-11: Revoke any remaining local preview URLs on unmount (Pitfall 2)
      for (const urls of localPreviewUrlsRef.current.values()) {
        urls.forEach(url => URL.revokeObjectURL(url))
      }
      localPreviewUrlsRef.current.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, myParticipantId])

  // ── Fallback: refetch receipts when Realtime misses events ────────────────
  // After sending a message, if the status stays 'sent' for 5s, refetch to catch
  // receipts that Realtime may have dropped (e.g. auth token expired).

  useEffect(() => {
    if (!conversationId || !myParticipantId) return

    const sentMessages = messages.filter((m) => m.isMine && m.statusIcon === 'sent' && !m._failed && !m._optimistic)
    if (sentMessages.length === 0) return

    const timer = setTimeout(() => {
      // Re-fetch latest messages to sync receipt status
      fetchMessagesApi(conversationId)
        .then(({ data }) => {
          const raw = data as RawApiMessage[]
          setMessages((prev) => {
            const apiMap = new Map(raw.map((m) => [m.message_id, m]))
            return prev.map((msg) => {
              const fresh = apiMap.get(msg.message_id)
              if (!fresh) return msg
              // Only update if the API has more receipts than local state
              const freshReceipts = fresh.receipts ?? []
              if (freshReceipts.length <= msg.receipts.length) return msg
              return enrichMessage(fresh, myParticipantId, recipientIdsRef.current)
            })
          })
        })
        .catch(() => {}) // best-effort
    }, 5000)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, myParticipantId, messages.length])

  // ── Safety: clear waitingForReply after 60s (daemon crash / no failed receipt) ─
  useEffect(() => {
    if (!waitingForReply) return
    const timer = setTimeout(() => setWaitingForReply(false), 60_000)
    return () => clearTimeout(timer)
  }, [waitingForReply])

  // ── Batch mark messages as read (viewport-based, called by AgentChatTab) ────

  const markMessagesRead = useCallback(async (messageIds: string[]) => {
    if (!conversationId || !myParticipantId || messageIds.length === 0) return

    // Route through API to bypass RLS (browser has no auth session)
    fetch(`/api/conversations/${conversationId}/receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_ids: messageIds,
        participant_id: myParticipantId,
        status: 'read',
      }),
    }).catch(() => {}) // fire-and-forget — receipt insertion is best-effort
  }, [conversationId, myParticipantId])

  return {
    messages,
    loading,
    error,
    sendMessage,
    retryMessage,
    toggleReaction,
    loadMore,
    hasMore,
    markMessagesRead,
    waitingForReply,
    // Phase 102: streaming support
    isStreaming,
    streamingMessageId,
    streamingMessages,
    processingState,
    abortStream,
    addOptimisticImageMessage,
  }
}
