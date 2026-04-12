import { NextRequest, NextResponse } from 'next/server'
import { resolveCurrentParticipantRow } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

// GET /api/my-participant
// Returns the authenticated user's chat_participants row.
// GROUP-08: User-aware lookup via `userId` query param (Supabase Auth UUID).
// Fallback: single human participant (backward-compatible for single-user system).
// Uses service_role — middleware mc_auth cookie already verifies auth.
export async function GET(request: NextRequest) {
  const { data, error } = await resolveCurrentParticipantRow(request)

  if (error || !data) {
    return NextResponse.json({ error: error ?? 'Participant not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
