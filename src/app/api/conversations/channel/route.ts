import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/conversations/channel
// Body: { name: string, memberParticipantIds: string[] }
// Creates a group conversation with Joan as owner and given members
// Per CHAT-UI-04
export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  // Step 1: Resolve Joan's participant_id
  const { data: joanRow, error: joanError } = await supabase
    .from('chat_participants')
    .select('participant_id')
    .eq('participant_type', 'human')
    .eq('external_id', user.id)
    .single()

  if (joanError || !joanRow) {
    return NextResponse.json({ error: 'Human participant record not found' }, { status: 404 })
  }

  const joanParticipantId = joanRow.participant_id

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

  // Step 3: INSERT conversation_participants — Joan as owner, members as member
  const participants = [
    { conversation_id: conversationId, participant_id: joanParticipantId, participation_role: 'owner' },
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
