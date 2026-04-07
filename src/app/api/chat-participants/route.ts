import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/chat-participants?type=agent
// Returns agent participants for DM/channel creation.
// Uses service_role to bypass RLS (middleware already verifies mc_auth).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'agent'

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('chat_participants')
    .select('participant_id, display_name, avatar_url, role')
    .eq('participant_type', type)
    .order('display_name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
