import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/conversations/direct
// Body: { agentParticipantId: string }
// Returns: { conversation_id: string }
// Calls get_or_create_direct_conversation RPC with auth.uid() as human_id
export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const agentParticipantId = body.agentParticipantId
  if (!agentParticipantId) {
    return NextResponse.json({ error: 'agentParticipantId is required' }, { status: 400 })
  }

  // Per D-01/D-02: auth.uid() IS the human participant_id (zero-lookup RLS per Phase 88)
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    p_human_id: user.id,
    p_agent_id: agentParticipantId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversation_id: data })
}
