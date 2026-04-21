import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock supabase module ──────────────────────────────────────────────────────
// Must be set up before importing the module under test.

const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase', () => ({
  createBrowserClient: () => ({ from: mockFrom }),
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OAuth expired state — mount-time check (OAUTH-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset module to avoid stale imports across tests
    vi.resetModules()
  })

  it('detects expired token on mount and returns true', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { status: 'expired', last_refreshed: null },
      error: null,
    })

    const { checkInitialTokenStatus } = await import('../use-agent-chat')
    const result = await checkInitialTokenStatus()
    expect(result).toBe(true)

    expect(mockFrom).toHaveBeenCalledWith('provider_token_status')
    expect(mockSelect).toHaveBeenCalledWith('status, last_refreshed')
    expect(mockEq).toHaveBeenCalledWith('provider', 'openai')
  })

  it('returns false when token is connected', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { status: 'connected', last_refreshed: new Date().toISOString() },
      error: null,
    })

    const { checkInitialTokenStatus } = await import('../use-agent-chat')
    const result = await checkInitialTokenStatus()
    expect(result).toBe(false)
  })

  it('returns false on query error (non-fatal)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'table not found' },
    })

    const { checkInitialTokenStatus } = await import('../use-agent-chat')
    const result = await checkInitialTokenStatus()
    expect(result).toBe(false)
  })
})

describe('OAuth expired state — receipt detection (OAUTH-02)', () => {
  it('identifies oauth_expired receipt correctly', async () => {
    const { isOauthExpiredReceipt } = await import('../use-agent-chat')
    expect(isOauthExpiredReceipt({
      status: 'failed',
      error_code: 'oauth_expired',
      message_id: 'msg-123',
    })).toBe(true)
  })

  it('ignores non-oauth receipts', async () => {
    const { isOauthExpiredReceipt } = await import('../use-agent-chat')
    expect(isOauthExpiredReceipt({
      status: 'failed',
      error_code: 'rate_limited',
      message_id: 'msg-456',
    })).toBe(false)
  })

  it('ignores successful receipts even with oauth error code', async () => {
    const { isOauthExpiredReceipt } = await import('../use-agent-chat')
    expect(isOauthExpiredReceipt({
      status: 'delivered',
      error_code: 'oauth_expired',
      message_id: 'msg-789',
    })).toBe(false)
  })
})
