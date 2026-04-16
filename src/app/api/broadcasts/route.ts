import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/broadcasts
// Body: { channel_id: string, text: string }
// Creates a broadcast conversation with Joan as owner and target agents as readonly
// Uses service_role (middleware already verifies mc_auth cookie for auth)
export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient()

  let body: { channel_id?: string; text?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { channel_id, text } = body

  if (!channel_id) {
    return NextResponse.json({ error: 'channel_id is required' }, { status: 400 })
  }
  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'text is required and must be non-empty' }, { status: 400 })
  }

  // Step 1: Fetch broadcast channel
  const { data: channel, error: channelError } = await supabase
    .from('broadcast_channels')
    .select('*')
    .eq('channel_id', channel_id)
    .maybeSingle()

  if (channelError) {
    return NextResponse.json({ error: channelError.message }, { status: 500 })
  }
  if (!channel) {
    return NextResponse.json({ error: 'Broadcast channel not found' }, { status: 404 })
  }

  // Step 2: Resolve Joan's participant_id (single human participant)
  const { data: joanRow, error: joanError } = await supabase
    .from('chat_participants')
    .select('participant_id')
    .eq('participant_type', 'human')
    .limit(1)
    .single()

  if (joanError || !joanRow) {
    return NextResponse.json({ error: 'Human participant record not found' }, { status: 404 })
  }

  const joanParticipantId = joanRow.participant_id

  // Step 3: Resolve target agent participant_ids based on channel target_type
  let agentParticipantIds: string[] = []

  if (channel.target_type === 'all') {
    const { data: agentParticipants, error: agentsError } = await supabase
      .from('chat_participants')
      .select('participant_id')
      .eq('participant_type', 'agent')

    if (agentsError) {
      return NextResponse.json({ error: agentsError.message }, { status: 500 })
    }
    agentParticipantIds = (agentParticipants ?? []).map((p) => p.participant_id)
  } else if (channel.target_type === 'filter' && channel.target_filter) {
    // target_filter is JSONB with shape { agent_ids: string[] }
    const filter = channel.target_filter as { agent_ids?: string[] }
    const filterIds = filter.agent_ids ?? []

    if (filterIds.length > 0) {
      const { data: filteredParticipants, error: filterError } = await supabase
        .from('chat_participants')
        .select('participant_id')
        .eq('participant_type', 'agent')
        .in('external_id', filterIds)

      if (filterError) {
        return NextResponse.json({ error: filterError.message }, { status: 500 })
      }
      agentParticipantIds = (filteredParticipants ?? []).map((p) => p.participant_id)
    }
  }

  // Step 4: INSERT conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      conversation_type: 'broadcast',
      context_type: 'broadcast',
      context_id: channel_id,
      title: channel.name,
    })
    .select('conversation_id')
    .single()

  if (convError || !conversation) {
    return NextResponse.json({ error: convError?.message ?? 'Failed to create conversation' }, { status: 500 })
  }

  const conversationId = conversation.conversation_id

  // Step 5: INSERT conversation_participants — Joan as owner, agents as readonly
  const participants = [
    { conversation_id: conversationId, participant_id: joanParticipantId, participation_role: 'owner' },
    ...agentParticipantIds.map((id) => ({
      conversation_id: conversationId,
      participant_id: id,
      participation_role: 'readonly',
    })),
  ]

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert(participants)

  if (partError) {
    return NextResponse.json({ error: partError.message }, { status: 500 })
  }

  // Step 6: INSERT broadcast record
  const { data: broadcast, error: broadcastError } = await supabase
    .from('broadcasts')
    .insert({
      channel_id,
      conversation_id: conversationId,
      sender_id: joanParticipantId,
      text: text.trim(),
    })
    .select('broadcast_id')
    .single()

  if (broadcastError || !broadcast) {
    return NextResponse.json({ error: broadcastError?.message ?? 'Failed to create broadcast' }, { status: 500 })
  }

  // Step 7: INSERT message
  const { error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: joanParticipantId,
      text: text.trim(),
      content_type: 'text',
    })

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 })
  }

  // Step 8: UPDATE conversation last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)

  return NextResponse.json(
    { conversation_id: conversationId, broadcast_id: broadcast.broadcast_id },
    { status: 201 }
  )
}
