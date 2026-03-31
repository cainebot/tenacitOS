'use client'

import { useCallback, useState } from 'react'
import { useLLMChat } from './use-llm-chat'
import type { CreationDocStatus, CharacterDef, IdentityFileType, LLMMessage } from '@/types/agents'
import { IDENTITY_FILE_TYPES } from '@/types/agents'

/**
 * Result type for useAgentCreationChat hook.
 */
export interface UseAgentCreationChatResult {
  // ── Pass-through from useLLMChat ──────────────────────────────────────────
  messages: LLMMessage[]
  streamingContent: string
  isStreaming: boolean
  error: string | null
  sendMessage: (text: string) => Promise<void>
  abort: () => void
  updateMessageData: (messageId: string, data: Record<string, unknown>) => void
  // ── Creation-specific ─────────────────────────────────────────────────────
  character: CharacterDef | null
  setCharacter: (char: CharacterDef) => void
  docs: CreationDocStatus[]
  updateDocStatus: (
    fileType: IdentityFileType,
    status: CreationDocStatus['status'],
    content?: string
  ) => void
  updateDocContent: (fileType: IdentityFileType, content: string) => void
  resetDocs: () => void
  completionProgress: number
}

/**
 * Document marker regex pattern for extracting generated identity files.
 * Matches: <!-- DOC:SOUL.md --> ... <!-- /DOC:SOUL.md -->
 */
const DOC_MARKER_PATTERN = /<!--\s*DOC:([\w.]+)\s*-->([\s\S]*?)<!--\s*\/DOC:[\w.]+\s*-->/g

/**
 * Initial docs state — 7 entries, one per identity file type, all pending.
 */
function createInitialDocs(): CreationDocStatus[] {
  return IDENTITY_FILE_TYPES.map((fileType) => ({
    fileType,
    status: 'pending' as const,
    content: '',
  }))
}

/**
 * useAgentCreationChat — creation flow wrapper around useLLMChat.
 *
 * Owns: character selection (Step 1), 7-file doc tracking (generating→done),
 * completion progress, and doc content editing (review step).
 *
 * CRITICAL: Inline component values (role selection, node selection, etc.) are stored
 * via chat.updateMessageData(messageId, { role: 'prospector' }) — they live in
 * message.data, NOT in separate React state. This survives re-renders and allows
 * the review step to reconstruct all user choices from conversation history.
 */
export function useAgentCreationChat(): UseAgentCreationChatResult {
  // ── Creation-specific state ───────────────────────────────────────────────
  const [character, setCharacterState] = useState<CharacterDef | null>(null)
  const [docs, setDocs] = useState<CreationDocStatus[]>(createInitialDocs)

  // ── handleAssistantMessage callback ──────────────────────────────────────
  // Called by useLLMChat.onFinish when assistant stream completes.
  // Parses content for DOC markers and updates doc status accordingly.
  const handleAssistantMessage = useCallback((message: LLMMessage) => {
    const content = message.content
    let found = false

    // Reset regex lastIndex before use
    DOC_MARKER_PATTERN.lastIndex = 0

    const matches: Array<{ fileType: IdentityFileType; content: string }> = []
    let match: RegExpExecArray | null

    while ((match = DOC_MARKER_PATTERN.exec(content)) !== null) {
      const fileTypeName = match[1] as IdentityFileType
      const docContent = match[2].trim()
      if (IDENTITY_FILE_TYPES.includes(fileTypeName)) {
        matches.push({ fileType: fileTypeName, content: docContent })
        found = true
      }
    }

    if (found) {
      setDocs((prev) =>
        prev.map((doc) => {
          const matched = matches.find((m) => m.fileType === doc.fileType)
          if (matched) {
            return { ...doc, status: 'done' as const, content: matched.content }
          }
          return doc
        })
      )
    }
    // If no markers found, leave docs unchanged (normal conversation message)
  }, [])

  // ── Initialize useLLMChat ─────────────────────────────────────────────────
  const chat = useLLMChat({
    api: '/api/llm/agent-creation/chat',
    systemPrompt: undefined, // Set by API route, not client
    onFinish: handleAssistantMessage,
  })

  // ── setCharacter ──────────────────────────────────────────────────────────
  const setCharacter = useCallback((char: CharacterDef) => {
    setCharacterState(char)
  }, [])

  // ── updateDocStatus ───────────────────────────────────────────────────────
  const updateDocStatus = useCallback(
    (
      fileType: IdentityFileType,
      status: CreationDocStatus['status'],
      content?: string
    ) => {
      setDocs((prev) =>
        prev.map((doc) =>
          doc.fileType === fileType
            ? { ...doc, status, ...(content !== undefined ? { content } : {}) }
            : doc
        )
      )
    },
    []
  )

  // ── updateDocContent ──────────────────────────────────────────────────────
  const updateDocContent = useCallback((fileType: IdentityFileType, content: string) => {
    setDocs((prev) =>
      prev.map((doc) => (doc.fileType === fileType ? { ...doc, content } : doc))
    )
  }, [])

  // ── resetDocs ─────────────────────────────────────────────────────────────
  const resetDocs = useCallback(() => {
    setDocs(createInitialDocs())
  }, [])

  // ── completionProgress ────────────────────────────────────────────────────
  const completionProgress = docs.filter((d) => d.status === 'done').length / docs.length

  return {
    // Pass-through from useLLMChat
    messages: chat.messages,
    streamingContent: chat.streamingContent,
    isStreaming: chat.isStreaming,
    error: chat.error,
    sendMessage: chat.sendMessage,
    abort: chat.abort,
    updateMessageData: chat.updateMessageData,
    // Creation-specific
    character,
    setCharacter,
    docs,
    updateDocStatus,
    updateDocContent,
    resetDocs,
    completionProgress,
  }
}
