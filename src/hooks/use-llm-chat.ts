'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LLMMessage, LLMChatConfig } from '@/types/agents'

/**
 * Result type for useLLMChat hook.
 */
export interface UseLLMChatResult {
  messages: LLMMessage[]
  streamingContent: string
  isStreaming: boolean
  error: string | null
  sendMessage: (text: string) => Promise<void>
  abort: () => void
  updateMessageData: (messageId: string, data: Record<string, unknown>) => void
}

/**
 * Generate a unique ID for messages.
 * Uses crypto.randomUUID() when available, falls back to timestamp+random.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/**
 * useLLMChat — model-agnostic streaming chat hook with rAF buffer.
 *
 * CRITICAL DESIGN: This hook does NOT use `useChat` from `@ai-sdk/react`.
 * Tokens stream via a custom fetch + ReadableStream + requestAnimationFrame consumer.
 * Tokens accumulate in a useRef buffer and are flushed into state at display rate (~60fps),
 * not per token — zero React re-renders per individual token.
 *
 * @param config - LLMChatConfig with api endpoint, optional system prompt, callbacks
 */
export function useLLMChat(config: LLMChatConfig): UseLLMChatResult {
  // ── State (re-renders only on full message or display flush) ──────────────
  const [messages, setMessages] = useState<LLMMessage[]>(config.initialMessages ?? [])
  const [streamingContent, setStreamingContent] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // ── Refs (NO re-renders on mutation) ─────────────────────────────────────
  /** Accumulates incoming tokens between rAF frames */
  const bufferRef = useRef<string>('')
  /** Current rAF request ID; null means no flush is scheduled */
  const rafIdRef = useRef<number | null>(null)
  /** AbortController for cancelling in-flight stream */
  const abortRef = useRef<AbortController | null>(null)
  /** Mirror of messages state used inside async sendMessage without stale closure */
  const messagesRef = useRef<LLMMessage[]>(config.initialMessages ?? [])

  // ── updateMessageData ─────────────────────────────────────────────────────
  const updateMessageData = useCallback(
    (messageId: string, data: Record<string, unknown>) => {
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === messageId ? { ...msg, data: { ...msg.data, ...data } } : msg
        )
        messagesRef.current = updated
        return updated
      })
    },
    []
  )

  // ── abort ─────────────────────────────────────────────────────────────────
  const abort = useCallback(() => {
    abortRef.current?.abort()

    // If there was buffered content, create a partial assistant message
    if (bufferRef.current.trim().length > 0) {
      const partialMessage: LLMMessage = {
        id: generateId(),
        role: 'assistant',
        content: bufferRef.current,
        createdAt: new Date(),
      }
      setMessages((prev) => {
        const updated = [...prev, partialMessage]
        messagesRef.current = updated
        return updated
      })
      bufferRef.current = ''
    }

    setStreamingContent('')
    setIsStreaming(false)
  }, [])

  // ── sendMessage ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      // 1. Build user message
      const userMessage: LLMMessage = {
        id: generateId(),
        role: 'user',
        content: text,
        createdAt: new Date(),
      }

      // 2. Append to state and ref
      const withUser = [...messagesRef.current, userMessage]
      messagesRef.current = withUser
      setMessages(withUser)

      // 3. Reset streaming state
      setIsStreaming(true)
      setError(null)
      bufferRef.current = ''
      setStreamingContent('')

      // 4. Create new AbortController
      const controller = new AbortController()
      abortRef.current = controller

      try {
        // 5. Fetch the streaming endpoint
        const response = await fetch(config.api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messagesRef.current,
            system: config.systemPrompt,
          }),
          signal: controller.signal,
        })

        // 6. Check response.ok
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        if (!response.body) {
          throw new Error('Response body is null — streaming not supported')
        }

        // 7. Get reader + decoder
        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        // 8. Read loop — accumulate tokens into ref, flush via rAF
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value, { stream: true })
          bufferRef.current += text
          config.onToken?.(text)

          // Schedule rAF flush only if not already scheduled
          if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(() => {
              setStreamingContent(bufferRef.current)
              rafIdRef.current = null
            })
          }
        }

        // 9. Stream complete — finalize
        // Cancel any pending rAF
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current)
          rafIdRef.current = null
        }

        // Build final assistant message from complete buffer
        const assistantMessage: LLMMessage = {
          id: generateId(),
          role: 'assistant',
          content: bufferRef.current,
          createdAt: new Date(),
        }

        const withAssistant = [...messagesRef.current, assistantMessage]
        messagesRef.current = withAssistant
        setMessages(withAssistant)
        setStreamingContent('')
        setIsStreaming(false)
        bufferRef.current = ''

        config.onFinish?.(assistantMessage)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // User-initiated abort — just clear streaming state
          setIsStreaming(false)
          return
        }
        const errorMessage = err instanceof Error ? err.message : 'Streaming failed'
        setError(errorMessage)
        setIsStreaming(false)
      }
    },
    [config]
  )

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  return {
    messages,
    streamingContent,
    isStreaming,
    error,
    sendMessage,
    abort,
    updateMessageData,
  }
}
