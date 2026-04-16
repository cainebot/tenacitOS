'use client'

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { sendMessageWithAttachments } from '@/lib/chat'
import type { ChatInputPayload, ChatShortcut } from '@/components/application/chat-input'
import type { EnrichedMessage } from '@/types/chat'

interface UseChatSendOptions {
  conversationId: string | null
  sendMessage: (payload: { text: string; content_type?: string; parent_message_id?: string; skill_id?: string; skill_command?: string }) => Promise<void>
  shortcuts?: ChatShortcut[]
}

export function useChatSend({ conversationId, sendMessage, shortcuts = [] }: UseChatSendOptions) {
  const [replyToMessage, setReplyToMessage] = useState<EnrichedMessage | null>(null)
  const replyToRef = useRef<string | null>(null)
  const shortcutsRef = useRef<ChatShortcut[]>([])

  // Keep shortcutsRef current
  shortcutsRef.current = shortcuts

  const handleSend = useCallback(
    async (payload: ChatInputPayload) => {
      if (!conversationId) return

      const allFiles: File[] = [
        ...payload.images,
        ...(payload.files ?? []),
      ]

      if (payload.audioBlob) {
        const ext = payload.audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
        const audioFile = new File(
          [payload.audioBlob],
          `recording-${Date.now()}.${ext}`,
          { type: payload.audioBlob.type }
        )
        allFiles.push(audioFile)
      }

      const parentMessageId = replyToRef.current

      if (allFiles.length > 0) {
        try {
          await sendMessageWithAttachments(conversationId, {
            text: payload.text,
            files: allFiles,
            ...(parentMessageId ? { parent_message_id: parentMessageId } : {}),
            // T-99-05: Pass waveform snapshot for audio attachments
            ...(payload.waveformData ? { waveformData: payload.waveformData } : {}),
          })
        } catch {
          toast.error('Failed to send attachment')
        }
      } else if (payload.text.trim()) {
        const isSkill = !!payload.command
        const matchedShortcut = isSkill
          ? shortcutsRef.current.find((s) => s.id === payload.command)
          : null

        await sendMessage({
          text: payload.text,
          ...(parentMessageId ? { parent_message_id: parentMessageId } : {}),
          ...(isSkill && matchedShortcut ? {
            content_type: 'skill_invocation',
            skill_id: payload.command!,
            skill_command: `/${matchedShortcut.label}`,
          } : {}),
        })
      }

      replyToRef.current = null
      setReplyToMessage(null)
    },
    [conversationId, sendMessage]
  )

  const setReplyTo = useCallback((msg: EnrichedMessage) => {
    replyToRef.current = msg.message_id
    setReplyToMessage(msg)
  }, [])

  const clearReply = useCallback(() => {
    replyToRef.current = null
    setReplyToMessage(null)
  }, [])

  return { handleSend, replyToMessage, setReplyTo, clearReply }
}
