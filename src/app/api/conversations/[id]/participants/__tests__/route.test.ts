import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const createServiceRoleClientMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: createServiceRoleClientMock,
}))

const { GET } = await import('@/app/api/conversations/[id]/participants/route')

function buildRequest(conversationId: string) {
  const req = new NextRequest(`http://localhost/api/conversations/${conversationId}/participants`)
  return {
    req,
    context: { params: Promise.resolve({ id: conversationId }) },
  }
}

function buildServiceClient(options?: {
  cpRows?: Array<{ participant_id: string; participation_role: string }>
  profileRows?: Array<{
    participant_id: string
    participant_type: string
    display_name: string
    avatar_url: string | null
  }>
  query1Error?: { message: string } | null
}) {
  const {
    cpRows = [{ participant_id: 'agent-uuid-1', participation_role: 'member' }],
    profileRows = [
      {
        participant_id: 'agent-uuid-1',
        participant_type: 'agent',
        display_name: 'Pomni',
        avatar_url: null,
      },
    ],
    query1Error = null,
  } = options ?? {}

  const fromConvParticipants = vi.fn().mockResolvedValue({ data: cpRows, error: query1Error })
  const fromChatParticipants = vi.fn().mockResolvedValue({ data: profileRows, error: null })

  const chatParticipantsSelectIn = vi.fn(() => fromChatParticipants())
  const chatParticipantsSelect = vi.fn(() => ({ in: chatParticipantsSelectIn }))

  const from = vi.fn((table: string) => {
    if (table === 'conversation_participants') {
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => fromConvParticipants()) })),
      }
    }
    if (table === 'chat_participants') {
      return { select: chatParticipantsSelect }
    }
  })

  return { client: { from }, chatParticipantsSelect }
}

describe('GET /api/conversations/[id]/participants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns enriched participants with display_name and participant_type', async () => {
    const { client } = buildServiceClient({
      cpRows: [{ participant_id: 'agent-uuid-1', participation_role: 'member' }],
      profileRows: [
        {
          participant_id: 'agent-uuid-1',
          participant_type: 'agent',
          display_name: 'Pomni',
          avatar_url: 'https://example.com/pomni.png',
        },
      ],
    })
    createServiceRoleClientMock.mockReturnValue(client)

    const { req, context } = buildRequest('conv-1')
    const response = await GET(req, context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      {
        participant_id: 'agent-uuid-1',
        participation_role: 'member',
        participant_type: 'agent',
        display_name: 'Pomni',
        avatar_url: 'https://example.com/pomni.png',
      },
    ])
  })

  it('returns fallback UUID as display_name when chat_participants row is missing', async () => {
    const { client } = buildServiceClient({
      cpRows: [{ participant_id: 'orphan-uuid', participation_role: 'member' }],
      profileRows: [],
    })
    createServiceRoleClientMock.mockReturnValue(client)

    const { req, context } = buildRequest('conv-2')
    const response = await GET(req, context)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual([
      {
        participant_id: 'orphan-uuid',
        participation_role: 'member',
        participant_type: 'human',
        display_name: 'orphan-uuid',
        avatar_url: null,
      },
    ])
  })

  it('returns empty array when conversation has no participants', async () => {
    const { client, chatParticipantsSelect } = buildServiceClient({
      cpRows: [],
    })
    createServiceRoleClientMock.mockReturnValue(client)

    const { req, context } = buildRequest('conv-empty')
    const response = await GET(req, context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([])
    expect(chatParticipantsSelect).not.toHaveBeenCalled()
  })

  it('returns 500 when conversation_participants query fails', async () => {
    const { client } = buildServiceClient({
      query1Error: { message: 'DB error' },
    })
    createServiceRoleClientMock.mockReturnValue(client)

    const { req, context } = buildRequest('conv-err')
    const response = await GET(req, context)

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'DB error' })
  })
})
