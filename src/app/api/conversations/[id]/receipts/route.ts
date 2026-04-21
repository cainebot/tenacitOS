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
  const { message_ids, status, participant_id, mark_all_unread } = body

  if (!participant_id) {
    return NextResponse.json({ error: 'participant_id required' }, { status: 400 })
  }
  if (!['delivered', 'read'].includes(status)) {
    return NextResponse.json({ error: 'status must be delivered or read' }, { status: 400 })
  }

  // mark_all_unread mode: server-side resolves every message in the conversation
  // sent by someone else that lacks a `read` receipt for this participant, then
  // upserts receipts for all of them. Needed because the client only holds the
  // 30 most recent messages in memory, but the unread_count covers the full
  // history. Without this, old unread messages stay "unread" forever.
  let ids: string[]
  if (mark_all_unread) {
    const { data: msgs, error: fetchErr } = await supabase
      .from('messages')
      .select('message_id, sender_id, message_receipts(participant_id, status)')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .neq('sender_id', participant_id)

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }
    ids = (msgs ?? [])
      .filter(m => !(m.message_receipts ?? []).some(
        (r: { participant_id: string; status: string }) =>
          r.participant_id === participant_id && r.status === 'read'
      ))
      .map(m => m.message_id)
  } else {
    if (!Array.isArray(message_ids) || message_ids.length === 0) {
      return NextResponse.json({ error: 'message_ids array required' }, { status: 400 })
    }
    ids = message_ids
  }

  if (ids.length === 0) {
    return NextResponse.json({ ok: true, marked: 0 })
  }

  const receipts = ids.map((mid: string) => ({
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

  return NextResponse.json({ ok: true, marked: ids.length })
}
