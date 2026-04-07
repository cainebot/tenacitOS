import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/my-participant
// Returns Joan's chat_participants row (single human participant).
// Uses service_role — middleware mc_auth cookie already verifies auth.
export async function GET() {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('chat_participants')
    .select('*')
    .eq('participant_type', 'human')
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
