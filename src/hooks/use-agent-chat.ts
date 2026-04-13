'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase'
import {
  fetchMessages as fetchMessagesApi,
  fetchSingleMessage,
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

// ── OAUTH-02: Exported helper functions for unit testing (Plan 103-03 Task 1) ──

/**
 * Queries provider_token_status for the openai provider.
 * Returns true if status='expired', false otherwise (including on error).
 * Called on hook mount to show banner immediately on page reload.
 */
export async function checkInitialTokenStatus(): Promise<boolean> {
  try {
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from('provider_token_status')
      .select('status, last_refreshed')
      .eq('provider', 'openai')
      .single()

    return data?.status === 'expired'
  } catch {
    return false
  }
}

/**
 * Pure function: returns true if a receipt indicates an OAuth expiry failure.
 * status must be 'failed' AND error_code must be 'oauth_expired'.
 */
export function isOauthExpiredReceipt(receipt: { status?: string; error_code?: string }): boolean {
  return receipt.status === 'failed' && receipt.error_code === 'oauth_expired'
}

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
  /** Phase 108: true while cancel request is pending in grace window */
  isCancelling: boolean
  /** Phase 102 D-11: Adds optimistic image preview message before upload completes */
  addOptimisticImageMessage: (localUrls: string[], senderName: string, senderAvatar: string | null, files?: File[]) => string
  /** Phase 102 gap-closure: Removes a stuck optimistic message by temp ID */
  removeOptimisticMessage: (tempId: string) => void
  /** Phase 102.1 D-06: Transition optimistic message to upload error state */
  setUploadError: (tempId: string) => void
  /** OAUTH-02 (Plan 103-03): True when oauth_expired detected via Realtime receipt OR mount-time query */
  oauthExpired: boolean
}

const CANCEL_GRACE_MS = 2500

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

// ── Phase 102 gap-closure: Content types that carry attachments ──────────────
const MEDIA_CONTENT_TYPES: ContentType[] = ['image', 'file', 'audio', 'video']

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
  const [isCancelling, setIsCancelling] = useState(false)

  // ── OAUTH-02 (Plan 103-03): OAuth expired banner state ───────────────────────
  const [oauthExpired, setOauthExpired] = useState(false)
  const [pendingOauthRetries, setPendingOauthRetries] = useState<string[]>([])
  const tokenPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Streaming refs (Phase 102 — RAF buffer, no re-renders per token) ─────────
  const streamingBuffersRef = useRef<Map<string, string>>(new Map())
  const rafIdsRef = useRef<Map<string, number>>(new Map())
  // Ref mirror of streamingMessageId — accessible inside Realtime callback closures
  const streamingMessageIdRef = useRef<string | null>(null)
  streamingMessageIdRef.current = streamingMessageId

  // Abort target is always the persisted human prompt row returned by sendMessage API.
  const abortTargetMessageIdRef = useRef<string | null>(null)
  const activeGenerationRef = useRef<{
    promptMessageId: string | null
    replyMessageId: string | null
  }>({
    promptMessageId: null,
    replyMessageId: null,
  })
  const cancelGraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCancellingRef = useRef(false)
  isCancellingRef.current = isCancelling

  // Sender info cache — Realtime INSERT/UPDATE only has raw columns, no joins.
  // Populated from API responses to resolve senderName for Realtime payloads.
  const senderCacheRef = useRef<Map<string, { display_name: string; avatar_url: string | null }>>(new Map())

  // Stable ref for recipientIds — avoids stale closure in Realtime callbacks
  // (the subscription useEffect depends on [conversationId, myParticipantId] only;
  //  recipientIds can change async after the effect runs)
  const recipientIdsRef = useRef(recipientIds)
  recipientIdsRef.current = recipientIds

  const clearCancelGraceTimer = useCallback(() => {
    if (cancelGraceTimerRef.current) {
      clearTimeout(cancelGraceTimerRef.current)
      cancelGraceTimerRef.current = null
    }
  }, [])

  const setReplyAbortState = useCallback(
    (replyMessageId: string, abortState: EnrichedMessage['_abortState']) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.message_id !== replyMessageId) return m
          return { ...m, _abortState: abortState }
        })
      )
    },
    []
  )

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

  // ── OAUTH-02 (Q3 resolution): Check provider_token_status on mount ────────
  // If token is already expired when page loads, show banner immediately
  // without waiting for a new Realtime receipt. Runs once on mount.
  useEffect(() => {
    checkInitialTokenStatus().then((isExpired) => {
      if (isExpired) {
        setOauthExpired(true)
      }
    })
  }, []) // Run once on mount — no deps needed

  // ── OAUTH-02 (WR-02): Subscribe to provider_token_status via Realtime ──────
  // Auto-dismiss or re-show banner immediately when DB status changes,
  // e.g. after user completes OAuth in another tab. Complements the 3s poll
  // (tokenPollRef) which handles the retry flow; Realtime handles instant dismiss.
  useEffect(() => {
    const supabase = createBrowserClient()
    const channel = supabase
      .channel('provider-token-status-watch')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'provider_token_status',
          filter: 'provider=eq.openai',
        },
        (payload) => {
          const row = payload.new as { status: string }
          if (row.status === 'connected') setOauthExpired(false)
          if (row.status === 'expired') setOauthExpired(true)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, []) // Mount-only — provider filter is static

  // ── Initial fetch ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!conversationId || !myParticipantId) return

    // Phase 102: Reset streaming state on conversation switch (Pitfall 4)
    setIsStreaming(false)
    setStreamingMessageId(null)
    setStreamingMessages(new Map())
    setProcessingState(null)
    setIsCancelling(false)
    clearCancelGraceTimer()
    abortTargetMessageIdRef.current = null
    activeGenerationRef.current = { promptMessageId: null, replyMessageId: null }

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
  }, [clearCancelGraceTimer, conversationId, myParticipantId])

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
        const persistedPrompt = await sendMessageApi(conversationId, {
          text: payload.text,
          content_type: payload.content_type,
          ...(payload.parent_message_id ? { parent_message_id: payload.parent_message_id } : {}),
          ...(payload.skill_id ? { skill_id: payload.skill_id } : {}),
          ...(payload.skill_command ? { skill_command: payload.skill_command } : {}),
        })
        clearCancelGraceTimer()
        setIsCancelling(false)
        abortTargetMessageIdRef.current = persistedPrompt.message_id
        activeGenerationRef.current = {
          promptMessageId: persistedPrompt.message_id,
          replyMessageId: null,
        }
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
        clearCancelGraceTimer()
        setIsCancelling(false)
        abortTargetMessageIdRef.current = null
        activeGenerationRef.current = { promptMessageId: null, replyMessageId: null }
        toast.error('Failed to send message')
      }
    },
    [clearCancelGraceTimer, conversationId, myParticipantId, participant]
  )

  // ── Phase 102: Local preview URL tracking (D-11, Pitfall 2) ─────────────────
  const localPreviewUrlsRef = useRef<Map<string, string[]>>(new Map()) // message_id -> [objectURLs]

  // ── Retry failed message ───────────────────────────────────────────────────

  const retryMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) return

      // Use functional update to access current messages (avoids stale closure)
      let failedText: string | null = null
      let failedContentType: string = 'text'
      setMessages((prev) => {
        const failed = prev.find((m) => m.message_id === messageId && m._failed)
        if (failed) {
          failedText = failed.text ?? ''
          failedContentType = failed.content_type
        }
        // Reset failed state before retrying
        return prev.map((m) =>
          m.message_id === messageId ? { ...m, _failed: false, statusIcon: 'sent' } : m
        )
      })

      if (failedText === null) return

      try {
        setWaitingForReply(true)
        const persistedPrompt = await sendMessageApi(conversationId, {
          text: failedText ?? '',
          content_type: failedContentType,
        })
        clearCancelGraceTimer()
        setIsCancelling(false)
        abortTargetMessageIdRef.current = persistedPrompt.message_id
        activeGenerationRef.current = {
          promptMessageId: persistedPrompt.message_id,
          replyMessageId: null,
        }
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
        setWaitingForReply(false)
        clearCancelGraceTimer()
        setIsCancelling(false)
        abortTargetMessageIdRef.current = null
        activeGenerationRef.current = { promptMessageId: null, replyMessageId: null }
        toast.error('Failed to send message')
      }
    },
    [clearCancelGraceTimer, conversationId]
  )

  // ── Abort streaming (Phase 102 — D-08, D-09) ─────────────────────────────

  const abortStream = useCallback(async () => {
    if (isCancellingRef.current) return

    const replyMessageId = streamingMessageId
    const promptMessageId = abortTargetMessageIdRef.current
    if (!replyMessageId || !promptMessageId) return

    setIsCancelling(true)
    setReplyAbortState(replyMessageId, 'canceling')
    clearCancelGraceTimer()
    cancelGraceTimerRef.current = setTimeout(() => {
      if (!isCancellingRef.current) return
      setIsCancelling(false)
      setReplyAbortState(replyMessageId, undefined)
      toast.error('No se pudo cancelar. La respuesta sigue en curso.')
    }, CANCEL_GRACE_MS)

    try {
      const res = await fetch(`/api/messages/${promptMessageId}/abort`, {
        method: 'POST',
      })
      if (!res.ok) {
        clearCancelGraceTimer()
        setIsCancelling(false)
        setReplyAbortState(replyMessageId, undefined)
        toast.error('No se pudo cancelar. Intentalo de nuevo.')
      }
    } catch {
      clearCancelGraceTimer()
      setIsCancelling(false)
      setReplyAbortState(replyMessageId, undefined)
      toast.error('No se pudo cancelar. Intentalo de nuevo.')
    }
  }, [clearCancelGraceTimer, setReplyAbortState, streamingMessageId])

  // ── Optimistic image preview (Phase 102 — D-11, D-12) ────────────────────

  const addOptimisticImageMessage = useCallback((
    localUrls: string[],
    senderName: string,
    senderAvatar: string | null,
    files?: File[],
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
      _pendingFiles: files ?? [],
    }

    setMessages(prev => [...prev, optimisticMsg])
    return tempId
  }, [conversationId, myParticipantId])

  /** Phase 102 gap-closure: Remove a stuck optimistic message by temp ID */
  const removeOptimisticMessage = useCallback((tempId: string) => {
    // Revoke any ObjectURLs for this message
    const urls = localPreviewUrlsRef.current.get(tempId)
    if (urls) {
      urls.forEach(url => URL.revokeObjectURL(url))
      localPreviewUrlsRef.current.delete(tempId)
    }
    // Remove from messages array
    setMessages(prev => prev.filter(m => m.message_id !== tempId))
  }, [])

  /** Phase 102.1 D-06: Transition optimistic message to upload error state */
  const setUploadError = useCallback((tempId: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.message_id === tempId ? { ...m, _uploadError: true } : m
      )
    )
  }, [])

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
          // Clear optimistic typing when agent responds with actual content.
          // Streaming placeholders arrive with empty text — keep dots visible
          // until the first UPDATE with text/processing state clears them.
          if (raw.sender_id !== myParticipantId && raw.text && raw.text.length > 0) {
            setWaitingForReply(false)
          }
          // Phase 102 fix: For media messages with local preview, DON'T replace the
          // optimistic message immediately — Realtime INSERT lacks JOINed attachments,
          // which causes a flash to FileBubble fallback. Instead, keep the optimistic
          // preview (with blob URLs) and let fetchSingleMessage do the full replacement.
          const isMediaInsert = MEDIA_CONTENT_TYPES.includes(raw.content_type as ContentType)

          setMessages((prev) => {
            // Skip if already present (handles dedup of optimistic messages)
            if (prev.some((m) => m.message_id === raw.message_id && !m._optimistic)) {
              return prev
            }
            const enriched = enrichMessage(raw, myParticipantId, recipientIdsRef.current)
            // Replace optimistic with real message if same text + mine, else append
            // Phase 102 gap-closure: Extended dedup to handle image/file messages where text is null
            const optimisticIdx = prev.findIndex(
              (m) =>
                m._optimistic &&
                m.isMine &&
                m.sender_id === raw.sender_id &&
                (
                  // Text message dedup (existing): match by text content
                  (m.text === raw.text && m.text !== null) ||
                  // Image/file message dedup (new): match by content_type + _isLocalPreview flag
                  (m._isLocalPreview && (raw.content_type === 'image' || raw.content_type === 'file'))
                )
            )

            if (optimisticIdx !== -1) {
              // For media with local preview: keep the optimistic blob preview visible,
              // just update the message_id so fetchSingleMessage can find & replace it.
              // Don't revoke blob URLs yet — that happens when fetchSingleMessage replaces.
              if (isMediaInsert && prev[optimisticIdx]._isLocalPreview) {
                const next = [...prev]
                next[optimisticIdx] = { ...prev[optimisticIdx], message_id: raw.message_id }
                return next
              }
              const next = [...prev]
              next[optimisticIdx] = enriched
              return next
            }
            return [...prev, enriched]
          })

          // Phase 102 gap-closure: Realtime INSERT lacks JOINed message_attachments.
          // For media messages, refetch the full message (with attachments + signed URLs)
          // and merge into state. This replaces the optimistic preview with real data.
          if (isMediaInsert) {
            fetchSingleMessage(conversationId!, raw.message_id)
              .then((fullMsg) => {
                if (!fullMsg) return
                const full = fullMsg as RawApiMessage
                if (!full.attachments || full.attachments.length === 0) return
                // Resolve sender from cache for consistency
                if (!full.sender && senderCacheRef.current.has(full.sender_id)) {
                  full.sender = senderCacheRef.current.get(full.sender_id)!
                }
                const enrichedFull = enrichMessage(full, myParticipantId, recipientIdsRef.current)
                setMessages(prev => {
                  // Revoke blob URLs from the optimistic preview now that real data arrived
                  const optimistic = prev.find(m => m.message_id === raw.message_id && m._isLocalPreview)
                  if (optimistic) {
                    const urls = localPreviewUrlsRef.current.get(optimistic.message_id)
                      ?? localPreviewUrlsRef.current.get(raw.message_id)
                    if (urls) {
                      urls.forEach(url => URL.revokeObjectURL(url))
                      localPreviewUrlsRef.current.delete(optimistic.message_id)
                      localPreviewUrlsRef.current.delete(raw.message_id)
                    }
                  }
                  return prev.map(m =>
                    m.message_id === raw.message_id ? enrichedFull : m
                  )
                })
              })
              .catch(() => {}) // best-effort — image will render on next refresh
          }

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
            if (activeGenerationRef.current.promptMessageId) {
              activeGenerationRef.current.replyMessageId = updated.message_id
            }
            if (isCancellingRef.current) {
              setReplyAbortState(updated.message_id, 'canceling')
            }
            return
          }

          // ── Streaming text (real tokens arriving) per D-01, D-02 ────────────
          if (hasPartialText) {
            // Turn off waitingForReply and processing state — user sees real text now (D-03)
            setWaitingForReply(false)
            setProcessingState(null)
            setIsStreaming(true)
            setStreamingMessageId(updated.message_id)
            if (activeGenerationRef.current.promptMessageId) {
              activeGenerationRef.current.replyMessageId = updated.message_id
            }
            if (isCancellingRef.current) {
              setReplyAbortState(updated.message_id, 'canceling')
            }

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
          // Only update the full message when NOT actively streaming text.
          // During streaming, hasPartialText is true and the RAF buffer handles display;
          // re-enriching here would overwrite the buffer with the partial DB row text.

          // WR-01 fix: Skip re-enrich when processing_state transitions to null
          // (daemon cleared it before streaming tokens arrive). Supabase sends null
          // (not undefined) for cleared columns — only match explicit null.
          if (updated.processing_state === null && updated.message_id === streamingMessageIdRef.current) {
            return
          }

          if (!hasPartialText) {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.message_id !== updated.message_id) return m
                // Only re-enrich if content_type actually changed or OG data arrived (avoid noisy re-renders)
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

          // Phase 108: Finalize active generation when human prompt receipt settles.
          // Receipt rows are keyed to prompt message_id, while streamed text lives on reply row.
          if (receipt.status === 'processed' || receipt.status === 'failed') {
            const activeGeneration = activeGenerationRef.current
            const isActivePromptReceipt =
              !!activeGeneration.promptMessageId &&
              receipt.message_id === activeGeneration.promptMessageId

            if (!isActivePromptReceipt) {
              return
            }

            const replyMessageId =
              activeGeneration.replyMessageId ?? streamingMessageIdRef.current
            const shouldMarkCanceled = isCancellingRef.current

            if (replyMessageId) {
              const pendingRaf = rafIdsRef.current.get(replyMessageId)
              if (pendingRaf !== undefined) {
                cancelAnimationFrame(pendingRaf)
                rafIdsRef.current.delete(replyMessageId)
              }

              const bufferedText = streamingBuffersRef.current.get(replyMessageId) ?? null
              setMessages((prev) => {
                const target = prev.find((m) => m.message_id === replyMessageId)
                if (!target) return prev

                const finalText = bufferedText && bufferedText.length > 0
                  ? bufferedText
                  : target.text

                if (shouldMarkCanceled && (!finalText || finalText.length === 0)) {
                  return prev.filter((m) => m.message_id !== replyMessageId)
                }

                return prev.map((m) => {
                  if (m.message_id !== replyMessageId) return m
                  return {
                    ...m,
                    text: finalText ?? m.text,
                    _abortState: shouldMarkCanceled ? 'canceled' : undefined,
                  }
                })
              })

              if (!shouldMarkCanceled && !bufferedText) {
                fetchMessagesApi(conversationId!)
                  .then(({ data }) => {
                    const raw = data as RawApiMessage[]
                    const target = raw.find((m) => m.message_id === replyMessageId)
                    if (target?.text) {
                      setMessages((prev) =>
                        prev.map((m) => {
                          if (m.message_id !== replyMessageId) return m
                          return { ...m, text: target.text }
                        })
                      )
                    }
                  })
                  .catch(() => {})
              }

              streamingBuffersRef.current.delete(replyMessageId)
              setStreamingMessages((prev) => {
                const next = new Map(prev)
                next.delete(replyMessageId)
                return next
              })
            }

            clearCancelGraceTimer()
            setIsCancelling(false)
            abortTargetMessageIdRef.current = null
            activeGenerationRef.current = {
              promptMessageId: null,
              replyMessageId: null,
            }

            if (!replyMessageId || replyMessageId === streamingMessageIdRef.current) {
              setIsStreaming(false)
              setStreamingMessageId(null)
              setProcessingState(null)
            }
          }

          // OAUTH-02 (D-08): Detect oauth_expired -> activate banner + queue retry
          const newReceipt = payload.new as { status?: string; error_code?: string; message_id?: string }
          if (isOauthExpiredReceipt(newReceipt)) {
            setOauthExpired(true)
            setPendingOauthRetries(prev => {
              if (newReceipt.message_id && !prev.includes(newReceipt.message_id)) {
                return [...prev, newReceipt.message_id]
              }
              return prev
            })
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
      clearCancelGraceTimer()
      abortTargetMessageIdRef.current = null
      activeGenerationRef.current = { promptMessageId: null, replyMessageId: null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearCancelGraceTimer, conversationId, myParticipantId])

  // ── Fallback: full sync when Realtime misses events ───────────────────────
  // After sending a message, if the status stays 'sent' for 5s, refetch to catch
  // receipts AND missing messages that Realtime may have dropped (e.g. auth token
  // expired, subscription lost). This also replaces orphaned optimistic messages
  // with their real DB counterparts.

  useEffect(() => {
    if (!conversationId || !myParticipantId) return

    const hasPendingSent = messages.some((m) => m.isMine && m.statusIcon === 'sent' && !m._failed && !m._optimistic)
    const hasOrphanedOptimistic = messages.some((m) => m._optimistic)
    if (!hasPendingSent && !hasOrphanedOptimistic) return

    const timer = setTimeout(() => {
      fetchMessagesApi(conversationId)
        .then(({ data }) => {
          const raw = data as RawApiMessage[]
          // Populate sender cache from fresh API data
          for (const m of raw) {
            if (m.sender) senderCacheRef.current.set(m.sender_id, m.sender)
          }
          setMessages((prev) => {
            const localIds = new Set(prev.map((m) => m.message_id))
            const apiMap = new Map(raw.map((m) => [m.message_id, m]))

            // 1. Update existing messages (receipt sync) + replace orphaned optimistic
            let updated = prev.map((msg) => {
              // Replace optimistic messages with their real DB counterpart
              // (matched by sender + text, same logic as Realtime dedup)
              if (msg._optimistic && msg.isMine) {
                const realMatch = raw.find(
                  (r) =>
                    r.sender_id === msg.sender_id &&
                    r.text === msg.text &&
                    r.text !== null &&
                    !localIds.has(r.message_id)
                )
                if (realMatch) {
                  localIds.add(realMatch.message_id) // prevent duplicate append
                  return enrichMessage(realMatch, myParticipantId, recipientIdsRef.current)
                }
              }

              const fresh = apiMap.get(msg.message_id)
              if (!fresh) return msg
              const freshReceipts = fresh.receipts ?? []
              const hasNewReceipts = freshReceipts.length > msg.receipts.length
              const hasNewText = !msg.text && !!fresh.text
              if (!hasNewReceipts && !hasNewText) return msg
              return enrichMessage(fresh, myParticipantId, recipientIdsRef.current)
            })

            // 2. Append messages from API that are missing locally
            // (Realtime INSERT was dropped — e.g. expired auth token)
            const apiReversed = [...raw].reverse() // API returns newest-first; reverse to ascending
            const missing = apiReversed
              .filter((m) => !localIds.has(m.message_id))
              .map((m) => enrichMessage(m, myParticipantId, recipientIdsRef.current))

            if (missing.length > 0) {
              // Insert missing messages in chronological order
              updated = [...updated, ...missing].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
            }

            return updated
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

  // ── OAUTH-02 (D-09): Poll provider_token_status for token renewal ──────────
  // Starts when oauthExpired becomes true, stops when token is renewed.
  // On renewal: dismiss banner + auto-retry all pending failed messages.
  useEffect(() => {
    if (!oauthExpired) {
      // Clear poll when not expired
      if (tokenPollRef.current) {
        clearInterval(tokenPollRef.current)
        tokenPollRef.current = null
      }
      return
    }

    const firstErrorTime = Date.now()

    const checkTokenStatus = async () => {
      try {
        const supabase = createBrowserClient()
        const { data } = await supabase
          .from('provider_token_status')
          .select('status, last_refreshed')
          .eq('provider', 'openai')
          .single()

        if (data?.status === 'connected' && data.last_refreshed) {
          const refreshedAt = new Date(data.last_refreshed).getTime()
          // D-09 / Pitfall 5: Only retry if token was refreshed AFTER the first error
          if (refreshedAt > firstErrorTime) {
            // Token renewed — dismiss banner and retry failed messages
            setOauthExpired(false)

            // D-10: Auto-retry all pending messages
            const messageIds = [...pendingOauthRetries]
            setPendingOauthRetries([])

            for (const msgId of messageIds) {
              try {
                await retryMessage(msgId)
              } catch {
                // Individual retry failure is non-fatal
              }
            }
          }
        }
      } catch {
        // Poll failure is non-fatal — try again next interval
      }
    }

    // Poll every 3 seconds (fast enough for good UX, light on Supabase)
    tokenPollRef.current = setInterval(checkTokenStatus, 3000)

    // Cleanup on unmount or oauthExpired change
    return () => {
      if (tokenPollRef.current) {
        clearInterval(tokenPollRef.current)
        tokenPollRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthExpired, pendingOauthRetries, retryMessage])

  // ── Fallback: poll for agent response when Realtime INSERT may be missed ───
  // Supabase Realtime can drop INSERT events (auth token expiry, RLS, network).
  // Poll every 5s while waitingForReply to catch agent responses and update
  // streaming placeholders whose text was finalized in the DB.
  useEffect(() => {
    if (!conversationId || !myParticipantId || !waitingForReply) return

    const interval = setInterval(() => {
      fetchMessagesApi(conversationId)
        .then(({ data }) => {
          const raw = data as RawApiMessage[]
          for (const m of raw) {
            if (m.sender) senderCacheRef.current.set(m.sender_id, m.sender)
          }
          setMessages((prev) => {
            const localIds = new Set(prev.map((m) => m.message_id))
            const apiMap = new Map(raw.map((m) => [m.message_id, m]))
            let changed = false

            // 1. Update existing messages with new text or receipts
            let updated = prev.map((msg) => {
              const fresh = apiMap.get(msg.message_id)
              if (!fresh) return msg
              const hasNewText = !msg.text && !!fresh.text
              const hasNewReceipts = (fresh.receipts ?? []).length > msg.receipts.length
              if (!hasNewText && !hasNewReceipts) return msg
              changed = true
              return enrichMessage(fresh, myParticipantId, recipientIdsRef.current)
            })

            // 2. Append missing messages from API
            const apiReversed = [...raw].reverse()
            const missing = apiReversed
              .filter((m) => !localIds.has(m.message_id))
              .map((m) => enrichMessage(m, myParticipantId, recipientIdsRef.current))

            if (missing.length > 0) {
              changed = true
              updated = [...updated, ...missing].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
            }
            return changed ? updated : prev
          })

          // Clear waitingForReply if agent has responded
          // API returns newest-first; check if latest message is from agent with text
          if (raw.length > 0 && raw[0].sender_id !== myParticipantId && raw[0].text) {
            setWaitingForReply(false)
          }
        })
        .catch(() => {})
    }, 5000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, myParticipantId, waitingForReply])

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
    isCancelling,
    addOptimisticImageMessage,
    removeOptimisticMessage,
    setUploadError,
    // OAUTH-02 (Plan 103-03): OAuth banner state
    oauthExpired,
  }
}
