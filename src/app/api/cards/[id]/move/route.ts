import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

type RouteParams = { params: Promise<{ id: string }> }

// PATCH /api/cards/[id]/move — move card to a new state via RPC
// Body: { state_id, moved_by, sort_order?, client_mutation_id?, client_id?, board_id? }
//
// Phase 73: When client_mutation_id and board_id are provided the route calls
// move_card_with_sync_event (which emits a causal sync event in the same
// transaction) and returns accepted_sync_id + client_mutation_id so the
// client can match the acknowledgment to its local mutation queue.
//
// When board_id is NOT provided the route falls back to move_card_with_order
// (Phase 68 behavior) for backward compat.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const { state_id, moved_by, sort_order, client_mutation_id, client_id, board_id } = body

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

  // Resolve sort_order: use provided value, or preserve current sort_order.
  // Backward compatibility: callers that don't compute sort keys (e.g. task
  // detail panel status dropdown) omit sort_order — we preserve the existing
  // value in that case.
  let effectiveSortOrder = sort_order as string | undefined
  if (!effectiveSortOrder || typeof effectiveSortOrder !== 'string') {
    const { data: currentCard } = await supabase
      .from('cards')
      .select('sort_order')
      .eq('card_id', id)
      .single()
    effectiveSortOrder = currentCard?.sort_order ?? ''
  }

  // Phase 73 path: board_id + client_mutation_id provided — use sync event RPC
  if (board_id && typeof board_id === 'string') {
    const { data: syncData, error: syncError } = await supabase.rpc(
      'move_card_with_sync_event',
      {
        p_card_id:     id,
        p_new_state_id: state_id as string,
        p_moved_by:    moved_by as string,
        p_sort_order:  effectiveSortOrder,
        p_board_id:    board_id as string,
        p_client_id:   (client_id as string) ?? null,
        p_mutation_id: (client_mutation_id as string) ?? null,
      }
    )

    if (syncError) {
      if (syncError.message.includes('only_humans')) {
        return NextResponse.json(
          {
            message:
              'This card is in a human-only column and cannot be moved by an agent',
            details: syncError.message,
            code: syncError.code,
          },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { message: syncError.message, code: syncError.code },
        { status: 500 }
      )
    }

    // Return updated card + causal acknowledgment metadata
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

    return NextResponse.json({
      card,
      accepted_sync_id: syncData as number,
      client_mutation_id: (client_mutation_id as string) ?? null,
    })
  }

  // Legacy path: no board_id — call move_card_with_order (Phase 68 RPC)
  const { error: rpcError } = await supabase.rpc('move_card_with_order', {
    p_card_id: id,
    p_new_state_id: state_id as string,
    p_moved_by: moved_by as string,
    p_sort_order: effectiveSortOrder,
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

  // Return updated card (legacy response shape — no sync metadata)
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
