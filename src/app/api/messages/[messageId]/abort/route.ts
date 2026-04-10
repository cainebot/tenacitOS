import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ messageId: string }> }

// POST /api/messages/{messageId}/abort
// Sets abort_requested=true on the message so the daemon stops generation (Phase 102 D-09)
// The daemon polls this flag every ~500ms during streaming and sends chat.abort to the gateway.
export async function POST(
  _req: NextRequest,
  { params }: RouteContext
) {
  const { messageId } = await params

  if (!messageId) {
    return NextResponse.json({ error: 'messageId is required' }, { status: 400 })
  }

  // ── Auth: verify caller is authenticated ──────────────────────────────────
  const authClient = createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Ownership: verify the message belongs to a conversation the caller participates in
  const supabase = createServiceRoleClient()

  const { data: msg } = await supabase
    .from('messages')
    .select('conversation_id')
    .eq('message_id', messageId)
    .single()

  if (!msg) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Resolve the caller's participant_id (single human participant in single-org setup)
  const { data: participant } = await supabase
    .from('chat_participants')
    .select('participant_id')
    .eq('participant_type', 'human')
    .limit(1)
    .single()

  if (!participant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: membership } = await supabase
    .from('conversation_participants')
    .select('participant_id')
    .eq('conversation_id', msg.conversation_id)
    .eq('participant_id', participant.participant_id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Update: set abort_requested flag ──────────────────────────────────────
  const { error } = await supabase
    .from('messages')
    .update({ abort_requested: true })
    .eq('message_id', messageId)

  if (error) {
    console.error('[abort] Supabase error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
