import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/conversations/direct
// Body: { agentParticipantId: string }
// Returns: { conversation_id: string }
// Uses service_role (middleware mc_auth already verifies auth)
export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient()

  // Resolve Joan's participant_id (single human participant)
  const { data: joanRow } = await supabase
    .from('chat_participants')
    .select('participant_id')
    .eq('participant_type', 'human')
    .limit(1)
    .single()

  if (!joanRow) {
    return NextResponse.json({ error: 'Human participant not found' }, { status: 404 })
  }

  const body = await request.json()
  const agentParticipantId = body.agentParticipantId
  if (!agentParticipantId) {
    return NextResponse.json({ error: 'agentParticipantId is required' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    p_human_id: joanRow.participant_id,
    p_agent_id: agentParticipantId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversation_id: data })
}
