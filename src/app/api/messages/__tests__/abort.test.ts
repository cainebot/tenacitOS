import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const createServerClientMock = vi.fn()
const createServiceRoleClientMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createServerClient: createServerClientMock,
  createServiceRoleClient: createServiceRoleClientMock,
}))

const { POST } = await import('@/app/api/messages/[messageId]/abort/route')

interface ServiceClientMocks {
  messageLookupEq: ReturnType<typeof vi.fn>
  participantEq: ReturnType<typeof vi.fn>
  membershipConversationEq: ReturnType<typeof vi.fn>
  membershipParticipantEq: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  updateEq: ReturnType<typeof vi.fn>
}

function buildRequest(messageId: string) {
  const req = new NextRequest(`http://localhost/api/messages/${messageId}/abort`, {
    method: 'POST',
  })
  return {
    req,
    context: { params: Promise.resolve({ messageId }) },
  }
}

function buildServerClient(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

function buildServiceClient(options?: {
  messageConversationId?: string | null
  hasParticipant?: boolean
  hasMembership?: boolean
  updateError?: { message: string } | null
}) {
  const {
    messageConversationId = 'conv-1',
    hasParticipant = true,
    hasMembership = true,
    updateError = null,
  } = options ?? {}

  const messageLookupSingle = vi.fn().mockResolvedValue({
    data: messageConversationId ? { conversation_id: messageConversationId } : null,
  })
  const messageLookupEq = vi.fn(() => ({ single: messageLookupSingle }))
  const messageLookupSelect = vi.fn(() => ({ eq: messageLookupEq }))

  const participantSingle = vi.fn().mockResolvedValue({
    data: hasParticipant ? { participant_id: 'human-1' } : null,
  })
  const participantLimit = vi.fn(() => ({ single: participantSingle }))
  const participantEq = vi.fn(() => ({ limit: participantLimit }))
  const participantSelect = vi.fn(() => ({ eq: participantEq }))

  const membershipMaybeSingle = vi.fn().mockResolvedValue({
    data: hasMembership ? { participant_id: 'human-1' } : null,
  })
  const membershipParticipantEq = vi.fn(() => ({ maybeSingle: membershipMaybeSingle }))
  const membershipConversationEq = vi.fn(() => ({ eq: membershipParticipantEq }))
  const membershipSelect = vi.fn(() => ({ eq: membershipConversationEq }))

  const updateEq = vi.fn().mockResolvedValue({ error: updateError })
  const update = vi.fn(() => ({ eq: updateEq }))

  const from = vi.fn((table: string) => {
    if (table === 'messages') {
      return {
        select: messageLookupSelect,
        update,
      }
    }
    if (table === 'chat_participants') {
      return {
        select: participantSelect,
      }
    }
    return {
      select: membershipSelect,
    }
  })

  return {
    client: { from },
    mocks: {
      messageLookupEq,
      participantEq,
      membershipConversationEq,
      membershipParticipantEq,
      update,
      updateEq,
    } satisfies ServiceClientMocks,
  }
}

describe('POST /api/messages/[messageId]/abort', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when caller is unauthenticated', async () => {
    createServerClientMock.mockReturnValue(buildServerClient(null))

    const { req, context } = buildRequest('human-msg-401')
    const response = await POST(req, context)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(createServiceRoleClientMock).not.toHaveBeenCalled()
  })

  it('returns 403 when user is not a member of the message conversation', async () => {
    createServerClientMock.mockReturnValue(buildServerClient({ id: 'user-1' }))
    const { client, mocks } = buildServiceClient({
      hasParticipant: true,
      hasMembership: false,
    })
    createServiceRoleClientMock.mockReturnValue(client)

    const humanPromptMessageId = 'human-msg-membership-denied'
    const { req, context } = buildRequest(humanPromptMessageId)
    const response = await POST(req, context)

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Forbidden' })
    expect(mocks.messageLookupEq).toHaveBeenCalledWith('message_id', humanPromptMessageId)
    expect(mocks.participantEq).toHaveBeenCalledWith('participant_type', 'human')
    expect(mocks.membershipConversationEq).toHaveBeenCalledWith('conversation_id', 'conv-1')
    expect(mocks.membershipParticipantEq).toHaveBeenCalledWith('participant_id', 'human-1')
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('returns 200 and flags abort_requested on the exact supplied human prompt row', async () => {
    createServerClientMock.mockReturnValue(buildServerClient({ id: 'user-1' }))
    const { client, mocks } = buildServiceClient()
    createServiceRoleClientMock.mockReturnValue(client)

    const humanPromptMessageId = 'human-msg-abc-123'
    const { req, context } = buildRequest(humanPromptMessageId)
    const response = await POST(req, context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })

    expect(mocks.update).toHaveBeenCalledWith({ abort_requested: true })
    expect(mocks.updateEq).toHaveBeenCalledWith('message_id', humanPromptMessageId)
  })
})
