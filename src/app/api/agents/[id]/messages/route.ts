/**
 * @deprecated Phase 89: Legacy compatibility shim.
 * GET redirects to /api/conversations/{id}/messages
 * POST resolves direct conversation and inserts into messages table.
 * Will be removed at end of v4.0 per D-06.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params
  const { searchParams } = new URL(request.url)

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve agent's participant_id
  const { data: agentParticipant } = await supabase
    .from('chat_participants')
    .select('participant_id')
    .eq('participant_type', 'agent')
    .eq('external_id', agentId)
    .single()

  if (!agentParticipant) {
    return NextResponse.json({ error: 'Agent not found in chat_participants' }, { status: 404 })
  }

  // Resolve conversation
  const { data: convId } = await supabase.rpc('get_or_create_direct_conversation', {
    p_human_id: user.id,
    p_agent_id: agentParticipant.participant_id,
  })

  if (!convId) {
    return NextResponse.json({ error: 'Could not resolve conversation' }, { status: 500 })
  }

  // 307 redirect to new endpoint (preserves query params)
  const newUrl = new URL(`/api/conversations/${convId}/messages`, request.url)
  searchParams.forEach((val, key) => {
    if (key !== 'topic') newUrl.searchParams.set(key, val)
  })
  return NextResponse.redirect(newUrl, 307)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve agent participant
  const { data: agentParticipant } = await supabase
    .from('chat_participants')
    .select('participant_id')
    .eq('participant_type', 'agent')
    .eq('external_id', agentId)
    .single()

  if (!agentParticipant) {
    return NextResponse.json({ error: 'Agent not found in chat_participants' }, { status: 404 })
  }

  // Resolve conversation
  const { data: convId } = await supabase.rpc('get_or_create_direct_conversation', {
    p_human_id: user.id,
    p_agent_id: agentParticipant.participant_id,
  })

  if (!convId) {
    return NextResponse.json({ error: 'Could not resolve conversation' }, { status: 500 })
  }

  // Per D-04: POST delegates internally (NOT redirect)
  const body = await request.json()
  const text = body.text?.trim()
  if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 })

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('messages')
    .insert({
      conversation_id: convId,
      sender_id: user.id,
      content_type: 'text',
      text,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
