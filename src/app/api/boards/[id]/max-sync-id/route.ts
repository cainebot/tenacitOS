import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/boards/[id]/max-sync-id — returns max(sync_id) for a board
// Used by useBoardData to seed seedFromServer with the correct baseline sync_id
// so the sync engine does not falsely detect a gap on initial load or reconnect.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: boardId } = await params

  if (!boardId || typeof boardId !== 'string') {
    return NextResponse.json({ message: 'boardId is required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('board_sync_events')
    .select('sync_id')
    .eq('board_id', boardId)
    .order('sync_id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ max_sync_id: data?.sync_id ?? 0 })
}
