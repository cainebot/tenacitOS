import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Abort route unit tests (Phase 102 FRONT-04) ───────────────────────────────
//
// Strategy: mock createServiceRoleClient so we can control the Supabase response,
// then import and call the POST handler directly.
//
// The route: control-panel/src/app/api/messages/[messageId]/abort/route.ts
//   POST handler — sets abort_requested=true on messages WHERE message_id=messageId
//   Returns 200 { ok: true } on success
//   Returns 500 { error: <message> } on Supabase error

// ── Mock @/lib/supabase ───────────────────────────────────────────────────────

const mockEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ update: mockUpdate }))
const mockServiceClient = { from: mockFrom }

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => mockServiceClient),
}))

// Import AFTER mocking
const { POST } = await import('@/app/api/messages/[messageId]/abort/route')

// ── Helper: build a minimal NextRequest ──────────────────────────────────────

function buildRequest(messageId: string) {
  const url = `http://localhost/api/messages/${messageId}/abort`
  const req = new NextRequest(url, { method: 'POST' })
  const params = Promise.resolve({ messageId })
  return { req, context: { params } }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/messages/[messageId]/abort (Phase 102)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should set abort_requested=true on the message row', async () => {
    // Arrange: Supabase succeeds (no error)
    mockEq.mockResolvedValue({ error: null })

    const { req, context } = buildRequest('msg-abc-123')

    // Act
    await POST(req, context)

    // Assert: update was called with abort_requested: true
    expect(mockFrom).toHaveBeenCalledWith('messages')
    expect(mockUpdate).toHaveBeenCalledWith({ abort_requested: true })
    expect(mockEq).toHaveBeenCalledWith('message_id', 'msg-abc-123')
  })

  it('should return 200 with { ok: true } on success', async () => {
    // Arrange: Supabase succeeds
    mockEq.mockResolvedValue({ error: null })

    const { req, context } = buildRequest('msg-success')

    // Act
    const response = await POST(req, context)

    // Assert: 200 status
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body).toEqual({ ok: true })
  })

  it('should return 500 with error message on Supabase failure', async () => {
    // Arrange: Supabase returns an error
    mockEq.mockResolvedValue({ error: { message: 'row not found' } })

    const { req, context } = buildRequest('msg-fail')

    // Act
    const response = await POST(req, context)

    // Assert: 500 status with error body
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body).toEqual({ error: 'row not found' })
  })
})
