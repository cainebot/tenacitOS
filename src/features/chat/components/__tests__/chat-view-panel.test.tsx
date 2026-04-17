/**
 * ChatViewPanel — scroll anchor behavior test stubs (Phase 91.2-03).
 *
 * The three primary Success Criteria (SC-91.2-1, SC-91.2-2, SC-91.2-5) are
 * verified **manually** via Chrome DevTools Slow-3G throttling per D-09 of
 * `.planning/phases/91.2-chat-scroll-anchor-skeleton-migration/91.2-CONTEXT.md`.
 * jsdom does not run real layout, so `scrollHeight`/`ResizeObserver` behavior
 * cannot be exercised end-to-end in unit tests without a full headless browser
 * harness (out of scope for this phase).
 *
 * These stubs exist so that:
 *   (a) the manual-only cases are documented inline next to the component,
 *   (b) the test runner reports them (`todo`) instead of silently ignoring,
 *   (c) future work can flesh them out when the testing harness is expanded.
 *
 * The fixture module `src/features/chat/__fixtures__/mock-messages.ts` is
 * imported so TS verifies the fixture compiles against `EnrichedMessage`.
 */

import { describe, it } from "vitest"
import {
  mockTextMessage,
  mockImageMessageWithDimensions,
  mockImageMessageNoDimensions,
} from "../../__fixtures__/mock-messages"

describe("ChatViewPanel — scroll anchor behavior", () => {
  it.todo(
    "SC-91.2-1: last message stays at bottom when images load (manual — jsdom has no layout)",
  )
  it.todo(
    "SC-91.2-2: conversation switch resets scroll to bottom (manual — jsdom has no layout)",
  )
  it.todo(
    "SC-91.2-5: skeleton → message transition has zero layout shift (manual — Chrome Slow 3G)",
  )

  it.todo(
    "renders MessageBubbleSkeleton when chat.loading is true (integration — needs useAgentChat mock harness)",
  )
  it.todo(
    "wires ResizeObserver to elements with [data-message-id] (integration — jsdom lacks ResizeObserver layout)",
  )

  it("fixture compiles: mock messages expose expected shape", () => {
    if (!mockTextMessage.message_id) throw new Error("fixture text regressed")
    if (!mockImageMessageWithDimensions.attachments[0]?.width_px) {
      throw new Error("fixture image-with-dims regressed")
    }
    if (mockImageMessageNoDimensions.attachments[0]?.width_px !== null) {
      throw new Error("fixture image-no-dims regressed")
    }
  })
})
