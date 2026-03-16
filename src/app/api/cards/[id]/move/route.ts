import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

type RouteParams = { params: Promise<{ id: string }> }

// PATCH /api/cards/[id]/move — move card to a new state via RPC
// Body: { state_id: string, moved_by: string, sort_order?: string }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const { state_id, moved_by, sort_order } = body

  if (!state_id || typeof state_id !== 'string') {
    return NextResponse.json(
      { message: 'state_id is required' },
      { status: 400 }
    )
  }
  if (!moved_by || typeof moved_by !== 'string') {
    return NextResponse.json(
      { message: 'moved_by is required' },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()

  // Call move_card RPC — enforces only_humans rule on source state
  const { error: rpcError } = await supabase.rpc('move_card', {
    p_card_id: id,
    p_new_state_id: state_id as string,
    p_moved_by: moved_by as string,
  })

  if (rpcError) {
    if (rpcError.message.includes('only_humans')) {
      return NextResponse.json(
        {
          message:
            'This card is in a human-only column and cannot be moved by an agent',
          details: rpcError.message,
          code: rpcError.code,
        },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { message: rpcError.message, code: rpcError.code },
      { status: 500 }
    )
  }

  // If sort_order was provided, update it separately
  if (sort_order !== undefined && typeof sort_order === 'string') {
    const { error: sortError } = await supabase
      .from('cards')
      .update({ sort_order: sort_order as string })
      .eq('card_id', id)

    if (sortError) {
      // Non-fatal — log but continue
      console.error('Failed to update sort_order after move:', sortError)
    }
  }

  // Return updated card
  const { data: card, error: fetchError } = await supabase
    .from('cards')
    .select('*')
    .eq('card_id', id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ message: 'Card not found' }, { status: 404 })
    }
    return NextResponse.json(
      { message: fetchError.message },
      { status: 500 }
    )
  }

  return NextResponse.json(card)
}
