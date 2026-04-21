import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/conversations/{id}/participants
// Returns all participants enriched with display_name, participant_type, avatar_url.
// Phase 109: GROUP-07 (@mention names) + GROUP-09 (typing indicator by type).
// Uses service_role (middleware mc_auth already verifies auth)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const supabase = createServiceRoleClient()

  // Query 1: conversation membership
  const { data: cpRows, error } = await supabase
    .from('conversation_participants')
    .select('participant_id, participation_role')
    .eq('conversation_id', conversationId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = cpRows ?? []
  if (rows.length === 0) {
    return NextResponse.json([])
  }

  const participantIds = rows.map(r => r.participant_id)

  // Query 2: participant profiles (display_name, type, avatar)
  const { data: profileRows } = await supabase
    .from('chat_participants')
    .select('participant_id, participant_type, display_name, avatar_url')
    .in('participant_id', participantIds)

  // O(1) lookup map for merge
  const profileMap = new Map(
    (profileRows ?? []).map(p => [p.participant_id, p])
  )

  // Merge: conversation membership + participant profiles
  const enriched = rows.map(row => {
    const profile = profileMap.get(row.participant_id)
    return {
      participant_id: row.participant_id,
      participation_role: row.participation_role,
      participant_type: (profile?.participant_type ?? 'human') as 'human' | 'agent',
      display_name: profile?.display_name ?? row.participant_id,
      avatar_url: profile?.avatar_url ?? null,
    }
  })

  return NextResponse.json(enriched)
}
