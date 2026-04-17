/**
 * Phase 91.2-03 — shared fixtures for chat test stubs.
 *
 * Minimal EnrichedMessage-shaped objects used by chat-view-panel.test.tsx and any
 * future chat component test. Typed via `as unknown as EnrichedMessage` because
 * the real type has ~20 runtime-sourced fields that aren't relevant for scroll /
 * layout testing.
 */

import type { EnrichedMessage } from "@/types/chat"

export const mockTextMessage: EnrichedMessage = {
  message_id: "msg-1",
  conversation_id: "conv-1",
  sender_id: "user-1",
  content_type: "text",
  text: "Hola mundo",
  created_at: "2026-04-17T10:00:00Z",
  attachments: [],
  reactions: [],
  isMine: true,
  senderName: "Me",
  senderAvatar: null,
  statusIcon: "read",
} as unknown as EnrichedMessage

export const mockImageMessageWithDimensions: EnrichedMessage = {
  ...mockTextMessage,
  message_id: "msg-2",
  content_type: "image",
  attachments: [
    {
      attachment_id: "att-1",
      message_id: "msg-2",
      url: "https://example.com/image.jpg",
      filename: "test.jpg",
      mime_type: "image/jpeg",
      size_bytes: 100000,
      width_px: 1024,
      height_px: 768,
      storage_path: "test/path",
    },
  ],
} as unknown as EnrichedMessage

export const mockImageMessageNoDimensions: EnrichedMessage = {
  ...mockImageMessageWithDimensions,
  message_id: "msg-3",
  attachments: [
    {
      ...(mockImageMessageWithDimensions.attachments[0] as Record<string, unknown>),
      width_px: null,
      height_px: null,
    },
  ],
} as unknown as EnrichedMessage
