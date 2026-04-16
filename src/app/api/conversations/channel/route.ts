import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { resolveCurrentParticipantId } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

// POST /api/conversations/channel
// Body: { name: string, memberParticipantIds: string[] }
// Creates a group conversation with the authenticated user as owner and given members.
// GROUP-08: User-aware owner resolution via `userId` query param or fallback to single human.
// Uses service_role (middleware already verifies mc_auth cookie for auth)
export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient()

  let body: { name?: string; memberParticipantIds?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, memberParticipantIds } = body

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'name is required and must be non-empty' }, { status: 400 })
  }
  if (!memberParticipantIds || !Array.isArray(memberParticipantIds) || memberParticipantIds.length === 0) {
    return NextResponse.json({ error: 'memberParticipantIds must be a non-empty array' }, { status: 400 })
  }

  // Step 1: Resolve the authenticated user's participant_id (GROUP-08)
  const { participantId: ownerParticipantId, error: ownerError } = await resolveCurrentParticipantId(request)

  if (ownerError || !ownerParticipantId) {
    return NextResponse.json({ error: ownerError ?? 'Human participant record not found' }, { status: 404 })
  }

  // Step 2: INSERT conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      conversation_type: 'group',
      title: name.trim(),
    })
    .select('conversation_id')
    .single()

  if (convError || !conversation) {
    return NextResponse.json({ error: convError?.message ?? 'Failed to create conversation' }, { status: 500 })
  }

  const conversationId = conversation.conversation_id

  // Step 3: INSERT conversation_participants — authenticated user as owner, members as member
  const participants = [
    { conversation_id: conversationId, participant_id: ownerParticipantId, participation_role: 'owner' },
    ...memberParticipantIds.map((id) => ({
      conversation_id: conversationId,
      participant_id: id,
      participation_role: 'member',
    })),
  ]

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert(participants)

  if (partError) {
    return NextResponse.json({ error: partError.message }, { status: 500 })
  }

  return NextResponse.json({ conversation_id: conversationId }, { status: 201 })
}
