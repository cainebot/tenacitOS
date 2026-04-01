import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/boards/[id]/sync-events?after=<sync_id>
 *
 * Catch-up endpoint: returns all board_sync_events with sync_id > `after`
 * for the given board, ordered ascending. Used by useBoardSyncEngine when
 * a gap is detected in the realtime stream or on reconnect after refresh.
 *
 * Query params:
 *   after  — sync_id watermark (required, integer)
 *   limit  — max events to return (optional, default 500, max 1000)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: boardId } = await params

  const searchParams = request.nextUrl.searchParams
  const afterParam = searchParams.get('after')
  const limitParam = searchParams.get('limit')

  const afterSyncId = afterParam ? parseInt(afterParam, 10) : 0
  const limit = Math.min(limitParam ? parseInt(limitParam, 10) : 500, 1000)

  if (isNaN(afterSyncId) || afterSyncId < 0) {
    return NextResponse.json(
      { message: 'after query param must be a non-negative integer' },
      { status: 400 },
    )
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.rpc('get_board_sync_events_since', {
    p_board_id: boardId,
    p_after_sync_id: afterSyncId,
  })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  // Map snake_case DB columns to camelCase SyncEvent interface
  const events = ((data ?? []) as Array<{
    sync_id: number
    board_id: string
    entity_type: string
    entity_id: string
    operation: string
    payload: Record<string, unknown>
    origin_client_id: string | null
    origin_mutation_id: string | null
    created_at: string
  }>)
    .slice(0, limit)
    .map((row) => ({
      syncId: row.sync_id,
      boardId: row.board_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      payload: row.payload,
      originClientId: row.origin_client_id,
      originMutationId: row.origin_mutation_id,
      createdAt: row.created_at,
    }))

  return NextResponse.json(events)
}
