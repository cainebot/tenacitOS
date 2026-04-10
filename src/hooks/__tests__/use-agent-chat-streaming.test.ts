import { describe, it } from 'vitest'

describe('useAgentChat — streaming (Phase 102)', () => {
  describe('FRONT-01: UPDATE handler accumulates streaming text', () => {
    it.todo('should accumulate partial text from Realtime UPDATE into streamingMessages Map')
    it.todo('should set isStreaming=true on first UPDATE with text content')
    it.todo('should set streamingMessageId to the message being streamed')
    it.todo('should clear waitingForReply when first streaming UPDATE arrives')
  })

  describe('FRONT-02: RAF buffer flushes at 60fps max', () => {
    it.todo('should batch multiple UPDATEs into a single state update per frame')
    it.todo('should not schedule duplicate RAFs for the same message_id')
  })

  describe('FRONT-03: processing state renders before tokens', () => {
    it.todo('should set processingState from UPDATE with processing_state field and no text')
    it.todo('should clear processingState when real text tokens arrive')
    it.todo('should clear waitingForReply when processing state is set')
  })

  describe('FRONT-05: optimistic image preview', () => {
    it.todo('should add optimistic message with local preview URLs via addOptimisticImageMessage')
    it.todo('should revoke ObjectURLs when server INSERT replaces optimistic message')
    it.todo('should revoke all ObjectURLs on unmount')
  })

  describe('streaming lifecycle', () => {
    it.todo('should finalize streaming when receipt transitions to processed')
    it.todo('should cancel pending RAFs and clear buffers on conversation switch')
    it.todo('should cancel pending RAFs on unmount')
  })
})
