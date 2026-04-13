import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Pure logic extracted from use-agent-chat.ts (Phase 102) ──────────────────
//
// Testing strategy: replicate the pure state logic from the hook's UPDATE handler,
// receipt finalization, and optimistic image preview — same pattern as
// use-agent-chat.test.ts (which tests toggleReaction's pure logic).
//
// The hook itself depends on Supabase Realtime and React context which are not
// feasible to mount in jsdom without a full React Testing Library harness.
// Instead we extract and unit-test the identical algorithms.

// ── Helpers replicated from use-agent-chat.ts ───────────────────────────────

/**
 * Replicate the UPDATE handler's streaming logic from use-agent-chat.ts lines 580-628.
 * Returns the state mutations that the handler would apply.
 */
interface UpdateHandlerResult {
  // State changes the handler would dispatch
  setWaitingForReply?: boolean
  setProcessingState?: string | null
  setStreamingMessageId?: string | null
  setIsStreaming?: boolean
  bufferSet?: { messageId: string; text: string }
  scheduledRaf?: boolean  // whether requestAnimationFrame was called
}

interface RawMessage {
  message_id: string
  text: string | null
  processing_state?: string | null
}

function simulateUpdateHandler(
  updated: RawMessage,
  rafIdsRef: Map<string, number>,
  rafMock: (cb: () => void) => number
): UpdateHandlerResult {
  const result: UpdateHandlerResult = {}

  const hasPartialText = !!updated.text && updated.text.length > 0
  const hasProcessingState = !!updated.processing_state && updated.processing_state !== 'generating'

  if (hasProcessingState && !hasPartialText) {
    result.setWaitingForReply = false
    result.setProcessingState = updated.processing_state!
    result.setStreamingMessageId = updated.message_id
    return result
  }

  if (hasPartialText) {
    result.setWaitingForReply = false
    result.setProcessingState = null
    result.setIsStreaming = true
    result.setStreamingMessageId = updated.message_id
    result.bufferSet = { messageId: updated.message_id, text: updated.text! }

    if (!rafIdsRef.has(updated.message_id)) {
      const rafId = rafMock(() => {})
      rafIdsRef.set(updated.message_id, rafId)
      result.scheduledRaf = true
    } else {
      result.scheduledRaf = false
    }
  }

  return result
}

/**
 * Replicate the receipt INSERT handler's finalization logic from use-agent-chat.ts lines 663-690.
 */
interface ReceiptHandlerResult {
  cancelledRaf?: number
  finalText?: string | null
  clearedStreaming: boolean
  setIsStreamingFalse: boolean
  setStreamingMessageIdNull: boolean
  setProcessingStateNull: boolean
}

interface Receipt {
  message_id: string
  status: string
}

function simulateReceiptFinalization(
  receipt: Receipt,
  rafIdsRef: Map<string, number>,
  streamingBuffersRef: Map<string, string>,
  cancelRafMock: (id: number) => void
): ReceiptHandlerResult {
  const result: ReceiptHandlerResult = {
    clearedStreaming: false,
    setIsStreamingFalse: false,
    setStreamingMessageIdNull: false,
    setProcessingStateNull: false,
  }

  if (receipt.status === 'processed' || receipt.status === 'failed') {
    const pendingRaf = rafIdsRef.get(receipt.message_id)
    if (pendingRaf !== undefined) {
      cancelRafMock(pendingRaf)
      rafIdsRef.delete(receipt.message_id)
      result.cancelledRaf = pendingRaf
    }

    const finalText = streamingBuffersRef.get(receipt.message_id) ?? null
    result.finalText = finalText

    streamingBuffersRef.delete(receipt.message_id)
    result.clearedStreaming = true
    result.setIsStreamingFalse = true
    result.setStreamingMessageIdNull = true
    result.setProcessingStateNull = true
  }

  return result
}

/**
 * Replicate the cleanup logic from the Realtime useEffect return (lines 780-793).
 */
function simulateChannelCleanup(
  rafIdsRef: Map<string, number>,
  streamingBuffersRef: Map<string, string>,
  localPreviewUrlsRef: Map<string, string[]>,
  cancelRafMock: (id: number) => void,
  revokeObjectUrlMock: (url: string) => void
): void {
  for (const rafId of rafIdsRef.values()) {
    cancelRafMock(rafId)
  }
  rafIdsRef.clear()
  streamingBuffersRef.clear()

  for (const urls of localPreviewUrlsRef.values()) {
    urls.forEach(url => revokeObjectUrlMock(url))
  }
  localPreviewUrlsRef.clear()
}

/**
 * Replicate addOptimisticImageMessage logic (lines 381-437).
 * Returns the optimistic message and the recorded local URL mapping.
 */
interface OptimisticImageResult {
  tempId: string
  localUrlsStored: string[]
  messageIsLocalPreview: boolean
  messageIsOptimistic: boolean
  messageContentType: string
  attachmentUrls: string[]
}

function simulateAddOptimisticImageMessage(
  localUrls: string[],
  senderName: string,
  senderAvatar: string | null,
  localPreviewUrlsRef: Map<string, string[]>,
  conversationId: string,
  myParticipantId: string
): OptimisticImageResult {
  const tempId = crypto.randomUUID()
  const localUrlsCopy = [...localUrls]
  localPreviewUrlsRef.set(tempId, localUrlsCopy)

  return {
    tempId,
    localUrlsStored: localUrlsCopy,
    messageIsLocalPreview: true,
    messageIsOptimistic: true,
    messageContentType: 'image',
    attachmentUrls: localUrlsCopy,
  }
}

/**
 * Replicate the INSERT handler's ObjectURL revocation logic (lines 534-543).
 */
function simulateInsertHandlerRevokeLocalPreviews(
  prevMessages: Array<{ message_id: string; _optimistic?: boolean; _isLocalPreview?: boolean }>,
  localPreviewUrlsRef: Map<string, string[]>,
  revokeObjectUrlMock: (url: string) => void
): void {
  const localPreviewMessages = prevMessages.filter(m => m._optimistic && m._isLocalPreview)
  for (const lpm of localPreviewMessages) {
    const urls = localPreviewUrlsRef.get(lpm.message_id)
    if (urls) {
      urls.forEach(url => revokeObjectUrlMock(url))
      localPreviewUrlsRef.delete(lpm.message_id)
    }
  }
}

interface ActiveGenerationIdentity {
  promptMessageId: string | null
  replyMessageId: string | null
}

function simulateCaptureAbortTargetFromSendResponse(sendResponse: { message_id: string }) {
  return {
    abortTargetMessageId: sendResponse.message_id,
    generation: {
      promptMessageId: sendResponse.message_id,
      replyMessageId: null,
    } satisfies ActiveGenerationIdentity,
  }
}

function simulateBindReplyToActiveGeneration(
  activeGeneration: ActiveGenerationIdentity,
  replyMessageId: string
): ActiveGenerationIdentity {
  if (!activeGeneration.promptMessageId) return activeGeneration
  return {
    ...activeGeneration,
    replyMessageId,
  }
}

function simulatePromptReceiptFinalization(params: {
  receiptMessageId: string
  activeGeneration: ActiveGenerationIdentity
  bufferedText: string | null
  existingReplyText: string | null
  isCancelling: boolean
}) {
  const {
    receiptMessageId,
    activeGeneration,
    bufferedText,
    existingReplyText,
    isCancelling,
  } = params

  const isActivePromptReceipt =
    !!activeGeneration.promptMessageId &&
    receiptMessageId === activeGeneration.promptMessageId
  if (!isActivePromptReceipt) {
    return {
      shouldFinalize: false,
    }
  }

  const finalText = bufferedText && bufferedText.length > 0
    ? bufferedText
    : existingReplyText
  const shouldRemoveReply = isCancelling && (!finalText || finalText.length === 0)

  return {
    shouldFinalize: true,
    shouldRemoveReply,
    abortState: !shouldRemoveReply && isCancelling ? 'canceled' : undefined,
    finalText,
    clearsStreaming: true,
    nextGeneration: { promptMessageId: null, replyMessageId: null } satisfies ActiveGenerationIdentity,
  }
}

function simulateCancelGraceTimeout(isCancelling: boolean, updatesStillStreaming: boolean) {
  if (!isCancelling || !updatesStillStreaming) {
    return {
      clearCancelingState: false,
      showToast: false,
      streamingContinues: updatesStillStreaming,
      allowRetry: !isCancelling,
    }
  }

  return {
    clearCancelingState: true,
    showToast: true,
    streamingContinues: true,
    allowRetry: true,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAgentChat — streaming (Phase 102)', () => {
  let rafIdsRef: Map<string, number>
  let streamingBuffersRef: Map<string, string>
  let localPreviewUrlsRef: Map<string, string[]>
  let rafCounter: number
  let rafMock: ReturnType<typeof vi.fn>
  let cancelRafMock: ReturnType<typeof vi.fn>
  let revokeObjectUrlMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    rafIdsRef = new Map()
    streamingBuffersRef = new Map()
    localPreviewUrlsRef = new Map()
    rafCounter = 1

    rafMock = vi.fn((_cb: () => void) => {
      return rafCounter++
    })
    cancelRafMock = vi.fn()
    revokeObjectUrlMock = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────────
  describe('FRONT-01: UPDATE handler accumulates streaming text', () => {
    it('should accumulate partial text from Realtime UPDATE into streamingMessages Map', () => {
      const updated: RawMessage = {
        message_id: 'msg-001',
        text: 'Hello wor',
        processing_state: null,
      }

      const result = simulateUpdateHandler(updated, rafIdsRef, rafMock)

      // The buffer should be set for this message_id
      expect(result.bufferSet).toEqual({ messageId: 'msg-001', text: 'Hello wor' })
      // A RAF was scheduled to flush to streamingMessages Map
      expect(result.scheduledRaf).toBe(true)
      // A second UPDATE accumulates more text (buffer overwrite = latest text)
      streamingBuffersRef.set(updated.message_id, updated.text!)
      streamingBuffersRef.set(updated.message_id, 'Hello world!')
      expect(streamingBuffersRef.get('msg-001')).toBe('Hello world!')
    })

    it('should set isStreaming=true on first UPDATE with text content', () => {
      const updated: RawMessage = {
        message_id: 'msg-001',
        text: 'Hello',
        processing_state: null,
      }

      const result = simulateUpdateHandler(updated, rafIdsRef, rafMock)

      expect(result.setIsStreaming).toBe(true)
    })

    it('should set streamingMessageId to the message being streamed', () => {
      const updated: RawMessage = {
        message_id: 'msg-abc',
        text: 'Streaming...',
        processing_state: null,
      }

      const result = simulateUpdateHandler(updated, rafIdsRef, rafMock)

      expect(result.setStreamingMessageId).toBe('msg-abc')
    })

    it('should clear waitingForReply when first streaming UPDATE arrives', () => {
      const updated: RawMessage = {
        message_id: 'msg-001',
        text: 'First token',
        processing_state: null,
      }

      const result = simulateUpdateHandler(updated, rafIdsRef, rafMock)

      expect(result.setWaitingForReply).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  describe('FRONT-02: RAF buffer flushes at 60fps max', () => {
    it('should batch multiple UPDATEs into a single state update per frame', () => {
      // Simulate 3 rapid UPDATEs for the same message before RAF fires
      const msgs: RawMessage[] = [
        { message_id: 'msg-001', text: 'Hello', processing_state: null },
        { message_id: 'msg-001', text: 'Hello wo', processing_state: null },
        { message_id: 'msg-001', text: 'Hello world', processing_state: null },
      ]

      for (const updated of msgs) {
        simulateUpdateHandler(updated, rafIdsRef, rafMock)
        // Accumulate in buffer (as the real hook does)
        streamingBuffersRef.set(updated.message_id, updated.text!)
      }

      // rafMock should have been called exactly once (first UPDATE schedules RAF,
      // subsequent UPDATEs find rafIdsRef already has entry and skip)
      expect(rafMock).toHaveBeenCalledTimes(1)

      // Buffer holds the LATEST text (only one RAF will fire with the latest value)
      expect(streamingBuffersRef.get('msg-001')).toBe('Hello world')
    })

    it('should not schedule duplicate RAFs for the same message_id', () => {
      const messageId = 'msg-dup'

      // First UPDATE — schedules RAF
      simulateUpdateHandler(
        { message_id: messageId, text: 'tok1', processing_state: null },
        rafIdsRef,
        rafMock
      )
      // rafIdsRef now has an entry for messageId

      // Second UPDATE — should NOT schedule another RAF (already has one)
      simulateUpdateHandler(
        { message_id: messageId, text: 'tok1 tok2', processing_state: null },
        rafIdsRef,
        rafMock
      )

      // rafMock only called once total
      expect(rafMock).toHaveBeenCalledTimes(1)
      // Only one RAF id stored
      expect(rafIdsRef.size).toBe(1)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  describe('FRONT-03: processing state renders before tokens', () => {
    it('should set processingState from UPDATE with processing_state field and no text', () => {
      const updated: RawMessage = {
        message_id: 'msg-ps',
        text: null,
        processing_state: 'analyzing_image',
      }

      const result = simulateUpdateHandler(updated, rafIdsRef, rafMock)

      expect(result.setProcessingState).toBe('analyzing_image')
      expect(result.setStreamingMessageId).toBe('msg-ps')
      // No RAF scheduled — processing state is set synchronously, no buffer needed
      expect(result.scheduledRaf).toBeUndefined()
      expect(rafMock).not.toHaveBeenCalled()
    })

    it('should clear processingState when real text tokens arrive', () => {
      // First: processing state arrives
      simulateUpdateHandler(
        { message_id: 'msg-ps', text: null, processing_state: 'thinking' },
        rafIdsRef,
        rafMock
      )

      // Then: real text arrives
      const result = simulateUpdateHandler(
        { message_id: 'msg-ps', text: 'Here is my answer...', processing_state: null },
        rafIdsRef,
        rafMock
      )

      // processingState is cleared when text arrives
      expect(result.setProcessingState).toBeNull()
      expect(result.setIsStreaming).toBe(true)
    })

    it('should clear waitingForReply when processing state is set', () => {
      const updated: RawMessage = {
        message_id: 'msg-ps',
        text: null,
        processing_state: 'transcribing_audio',
      }

      const result = simulateUpdateHandler(updated, rafIdsRef, rafMock)

      expect(result.setWaitingForReply).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  describe('FRONT-05: optimistic image preview', () => {
    it('should add optimistic message with local preview URLs via addOptimisticImageMessage', () => {
      const localUrls = ['blob:http://localhost/abc', 'blob:http://localhost/def']

      const result = simulateAddOptimisticImageMessage(
        localUrls,
        'Olivia Rhye',
        null,
        localPreviewUrlsRef,
        'conv-123',
        'participant-456'
      )

      // Message is marked as local preview + optimistic
      expect(result.messageIsLocalPreview).toBe(true)
      expect(result.messageIsOptimistic).toBe(true)
      expect(result.messageContentType).toBe('image')

      // Local URLs are stored in the ref for later revocation
      expect(localPreviewUrlsRef.has(result.tempId)).toBe(true)
      expect(localPreviewUrlsRef.get(result.tempId)).toEqual(localUrls)

      // Attachment URLs match the local blob URLs
      expect(result.attachmentUrls).toEqual(localUrls)
    })

    it('should revoke ObjectURLs when server INSERT replaces optimistic message', () => {
      // Setup: add an optimistic preview
      const localUrls = ['blob:http://localhost/img1', 'blob:http://localhost/img2']
      const addResult = simulateAddOptimisticImageMessage(
        localUrls,
        'User',
        null,
        localPreviewUrlsRef,
        'conv-1',
        'participant-1'
      )

      const prevMessages = [
        {
          message_id: addResult.tempId,
          _optimistic: true as const,
          _isLocalPreview: true as const,
        },
      ]

      // Server INSERT arrives — trigger revocation
      simulateInsertHandlerRevokeLocalPreviews(
        prevMessages,
        localPreviewUrlsRef,
        revokeObjectUrlMock
      )

      // Both ObjectURLs should have been revoked
      expect(revokeObjectUrlMock).toHaveBeenCalledTimes(2)
      expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:http://localhost/img1')
      expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:http://localhost/img2')

      // Entry removed from ref to prevent double-revocation
      expect(localPreviewUrlsRef.has(addResult.tempId)).toBe(false)
    })

    it('should revoke all ObjectURLs on unmount', () => {
      // Setup: two optimistic previews pending
      const urls1 = ['blob:http://localhost/a', 'blob:http://localhost/b']
      const urls2 = ['blob:http://localhost/c']

      const r1 = simulateAddOptimisticImageMessage(urls1, 'U', null, localPreviewUrlsRef, 'c', 'p')
      const r2 = simulateAddOptimisticImageMessage(urls2, 'U', null, localPreviewUrlsRef, 'c', 'p')

      // Also put a pending RAF
      rafIdsRef.set('msg-stream', 42)
      streamingBuffersRef.set('msg-stream', 'partial text')

      // Trigger cleanup (channel teardown / unmount)
      simulateChannelCleanup(
        rafIdsRef,
        streamingBuffersRef,
        localPreviewUrlsRef,
        cancelRafMock,
        revokeObjectUrlMock
      )

      // All ObjectURLs revoked
      expect(revokeObjectUrlMock).toHaveBeenCalledTimes(3)
      expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:http://localhost/a')
      expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:http://localhost/b')
      expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:http://localhost/c')

      // Refs cleared
      expect(localPreviewUrlsRef.size).toBe(0)
      expect(rafIdsRef.size).toBe(0)
      expect(streamingBuffersRef.size).toBe(0)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  describe('streaming lifecycle', () => {
    it('should finalize streaming when receipt transitions to processed', () => {
      // Setup: message is currently streaming
      const messageId = 'msg-final'
      const pendingRafId = 7
      rafIdsRef.set(messageId, pendingRafId)
      streamingBuffersRef.set(messageId, 'Complete answer text here.')

      const receipt: Receipt = { message_id: messageId, status: 'processed' }

      const result = simulateReceiptFinalization(
        receipt,
        rafIdsRef,
        streamingBuffersRef,
        cancelRafMock
      )

      // Pending RAF was cancelled
      expect(result.cancelledRaf).toBe(pendingRafId)
      expect(cancelRafMock).toHaveBeenCalledWith(pendingRafId)

      // Final text was extracted from buffer
      expect(result.finalText).toBe('Complete answer text here.')

      // Streaming state cleared
      expect(result.setIsStreamingFalse).toBe(true)
      expect(result.setStreamingMessageIdNull).toBe(true)
      expect(result.setProcessingStateNull).toBe(true)

      // Buffer and RAF map cleaned up
      expect(rafIdsRef.has(messageId)).toBe(false)
      expect(streamingBuffersRef.has(messageId)).toBe(false)
    })

    it('should cancel pending RAFs and clear buffers on conversation switch', () => {
      // Setup: streaming is in progress with two messages buffered
      rafIdsRef.set('msg-a', 10)
      rafIdsRef.set('msg-b', 11)
      streamingBuffersRef.set('msg-a', 'partial a')
      streamingBuffersRef.set('msg-b', 'partial b')

      // Simulate conversation switch cleanup
      simulateChannelCleanup(
        rafIdsRef,
        streamingBuffersRef,
        localPreviewUrlsRef,
        cancelRafMock,
        revokeObjectUrlMock
      )

      // Both RAFs cancelled
      expect(cancelRafMock).toHaveBeenCalledTimes(2)
      expect(cancelRafMock).toHaveBeenCalledWith(10)
      expect(cancelRafMock).toHaveBeenCalledWith(11)

      // Both Maps cleared
      expect(rafIdsRef.size).toBe(0)
      expect(streamingBuffersRef.size).toBe(0)
    })

    it('should cancel pending RAFs on unmount', () => {
      // Same as conversation switch — the cleanup function is the same
      rafIdsRef.set('msg-x', 99)
      streamingBuffersRef.set('msg-x', 'in flight')

      simulateChannelCleanup(
        rafIdsRef,
        streamingBuffersRef,
        localPreviewUrlsRef,
        cancelRafMock,
        revokeObjectUrlMock
      )

      expect(cancelRafMock).toHaveBeenCalledWith(99)
      expect(rafIdsRef.size).toBe(0)
    })
  })

  describe('Phase 108 abort lifecycle', () => {
    it('captures persisted human prompt message_id as abort target from send response', () => {
      const sendResponse = { message_id: 'human-prompt-123' }

      const result = simulateCaptureAbortTargetFromSendResponse(sendResponse)

      expect(result.abortTargetMessageId).toBe('human-prompt-123')
      expect(result.generation.promptMessageId).toBe('human-prompt-123')
      expect(result.generation.replyMessageId).toBeNull()
    })

    it('correlates prompt receipt to active reply placeholder cleanup/finalization', () => {
      const generation = simulateBindReplyToActiveGeneration(
        { promptMessageId: 'human-prompt-1', replyMessageId: null },
        'reply-placeholder-1'
      )

      const result = simulatePromptReceiptFinalization({
        receiptMessageId: 'human-prompt-1',
        activeGeneration: generation,
        bufferedText: 'partial daemon text',
        existingReplyText: null,
        isCancelling: false,
      })

      expect(result.shouldFinalize).toBe(true)
      expect(result.finalText).toBe('partial daemon text')
      expect(result.nextGeneration).toEqual({ promptMessageId: null, replyMessageId: null })
    })

    it('marks partial reply as canceled after successful cancel', () => {
      const result = simulatePromptReceiptFinalization({
        receiptMessageId: 'human-prompt-2',
        activeGeneration: { promptMessageId: 'human-prompt-2', replyMessageId: 'reply-2' },
        bufferedText: 'texto parcial',
        existingReplyText: null,
        isCancelling: true,
      })

      expect(result.shouldFinalize).toBe(true)
      expect(result.shouldRemoveReply).toBe(false)
      expect(result.abortState).toBe('canceled')
      expect(result.finalText).toBe('texto parcial')
    })

    it('removes empty placeholder when cancel succeeds before first token', () => {
      const result = simulatePromptReceiptFinalization({
        receiptMessageId: 'human-prompt-3',
        activeGeneration: { promptMessageId: 'human-prompt-3', replyMessageId: 'reply-3' },
        bufferedText: null,
        existingReplyText: null,
        isCancelling: true,
      })

      expect(result.shouldFinalize).toBe(true)
      expect(result.shouldRemoveReply).toBe(true)
      expect(result.abortState).toBeUndefined()
    })

    it('clears canceling state and keeps stream alive when grace timeout expires', () => {
      const result = simulateCancelGraceTimeout(true, true)

      expect(result.clearCancelingState).toBe(true)
      expect(result.showToast).toBe(true)
      expect(result.streamingContinues).toBe(true)
      expect(result.allowRetry).toBe(true)
    })

    it('allows a second cancel attempt after failed fallback', () => {
      const timeoutResult = simulateCancelGraceTimeout(true, true)
      expect(timeoutResult.allowRetry).toBe(true)
    })
  })
})
