/**
 * @deprecated Phase 89: Legacy compatibility shim.
 * Converts PATCH /read into message_receipts inserts.
 * Will be removed at end of v4.0 per D-06.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const messageIds: string[] = body.message_ids ?? []
  if (messageIds.length === 0) {
    return NextResponse.json({ error: 'message_ids required' }, { status: 400 })
  }

  // Look up conversation_ids for each message
  const serviceClient = createServiceRoleClient()
  const { data: msgs } = await serviceClient
    .from('messages')
    .select('message_id, conversation_id')
    .in('message_id', messageIds)

  if (!msgs || msgs.length === 0) {
    return NextResponse.json({ error: 'Messages not found' }, { status: 404 })
  }

  // Insert 'read' receipts into message_receipts
  const receipts = msgs.map((m: { message_id: string; conversation_id: string }) => ({
    message_id: m.message_id,
    conversation_id: m.conversation_id,
    participant_id: user.id,
    status: 'read',
  }))

  await serviceClient.from('message_receipts').upsert(receipts, {
    onConflict: 'message_id,participant_id,status',
  })

  return NextResponse.json({ ok: true })
}
