import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/conversations/{id}/participants
// Returns all participants in a conversation with their role.
// Uses service_role (middleware mc_auth already verifies auth)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('conversation_participants')
    .select('participant_id, participation_role')
    .eq('conversation_id', conversationId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
