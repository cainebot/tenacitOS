import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/conversations/{id}/receipts
// Body: { message_ids: string[], participant_id: string, status: 'delivered' | 'read' }
// Batch upserts message receipts via service_role (bypasses RLS).
// Uses service_role (middleware mc_auth already verifies auth)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const supabase = createServiceRoleClient()

  const body = await request.json()
  const { message_ids, status, participant_id } = body

  if (!Array.isArray(message_ids) || message_ids.length === 0) {
    return NextResponse.json({ error: 'message_ids array required' }, { status: 400 })
  }
  if (!participant_id) {
    return NextResponse.json({ error: 'participant_id required' }, { status: 400 })
  }
  if (!['delivered', 'read'].includes(status)) {
    return NextResponse.json({ error: 'status must be delivered or read' }, { status: 400 })
  }

  const receipts = message_ids.map((mid: string) => ({
    message_id: mid,
    conversation_id: conversationId,
    participant_id,
    status,
  }))

  const { error } = await supabase
    .from('message_receipts')
    .upsert(receipts, { onConflict: 'message_id,participant_id,status' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
