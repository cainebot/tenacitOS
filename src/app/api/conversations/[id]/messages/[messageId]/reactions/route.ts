import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; messageId: string }> }

// POST /api/conversations/{id}/messages/{messageId}/reactions
// Body: { emoji: string }
// Returns 201 with the inserted row, 409 on duplicate, 400 on missing emoji, 401 on auth failure
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: conversationId, messageId } = await params

  const serverClient = createServerClient()
  const {
    data: { user },
    error: authErr,
  } = await serverClient.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { emoji?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const emoji = body.emoji?.trim()
  if (!emoji) {
    return NextResponse.json({ error: 'emoji is required' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()

  const { data, error } = await serviceClient
    .from('message_reactions')
    .insert({
      message_id: messageId,
      conversation_id: conversationId,
      participant_id: user.id,
      emoji,
    })
    .select()
    .single()

  if (error) {
    // 23505 = unique_violation (duplicate reaction)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Reaction already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/conversations/{id}/messages/{messageId}/reactions
// Body: { emoji: string }
// Returns 204 on success, 400 on missing emoji, 401 on auth failure
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id: conversationId, messageId } = await params

  const serverClient = createServerClient()
  const {
    data: { user },
    error: authErr,
  } = await serverClient.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { emoji?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const emoji = body.emoji?.trim()
  if (!emoji) {
    return NextResponse.json({ error: 'emoji is required' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()

  const { error } = await serviceClient
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('conversation_id', conversationId)
    .eq('participant_id', user.id)
    .eq('emoji', emoji)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
