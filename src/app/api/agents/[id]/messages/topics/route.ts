/**
 * @deprecated Phase 89: Legacy compatibility shim.
 * Returns conversation topics derived from conversations table.
 * Will be removed at end of v4.0 per D-06.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find conversations where this agent participates
  const { data: agentParticipant } = await supabase
    .from('chat_participants')
    .select('participant_id')
    .eq('participant_type', 'agent')
    .eq('external_id', agentId)
    .single()

  if (!agentParticipant) {
    return NextResponse.json({ data: [] })
  }

  // Get conversations for this agent with distinct topics (derived from conversations table)
  const { data: conversations } = await supabase
    .from('conversation_participants')
    .select('conversations(topic, conversation_type, last_message_at)')
    .eq('participant_id', agentParticipant.participant_id)

  const topics = (conversations ?? [])
    .map((cp: { conversations: { topic: string | null; conversation_type: string; last_message_at: string | null } | null }) => cp.conversations)
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map(c => ({ topic: c.topic ?? 'general', type: c.conversation_type, last_message_at: c.last_message_at }))

  return NextResponse.json({ data: topics })
}
