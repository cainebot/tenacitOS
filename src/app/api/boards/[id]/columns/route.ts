import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createColumn } from '@/lib/boards'
import type { BoardColumnRow, BoardColumnStateRow } from '@/types/workflow'

type RouteParams = { params: Promise<{ id: string }> }

function errorResponse(
  status: number,
  message: string,
  details?: string,
  hint?: string,
  code?: string
) {
  return NextResponse.json({ message, details, hint, code }, { status })
}

// GET /api/boards/[id]/columns — return all columns for a board with state_ids
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const client = createServerClient()

  // Fetch columns ordered by position
  const { data: columns, error: cErr } = await client
    .from('board_columns')
    .select('*')
    .eq('board_id', id)
    .order('position')

  if (cErr) {
    return errorResponse(500, cErr.message, cErr.details, cErr.hint, cErr.code)
  }

  const boardColumns = columns as BoardColumnRow[]

  // Fetch state mappings for all columns in one query
  const columnIds = boardColumns.map((c) => c.column_id)
  let columnStateRows: BoardColumnStateRow[] = []

  if (columnIds.length > 0) {
    const { data: stateRows, error: sErr } = await client
      .from('board_column_states')
      .select('*')
      .in('column_id', columnIds)

    if (sErr) {
      return errorResponse(500, sErr.message, sErr.details, sErr.hint, sErr.code)
    }
    columnStateRows = stateRows as BoardColumnStateRow[]
  }

  // Group state_ids by column_id
  const statesByColumn = columnStateRows.reduce<Record<string, string[]>>(
    (acc, row) => {
      if (!acc[row.column_id]) acc[row.column_id] = []
      acc[row.column_id].push(row.state_id)
      return acc
    },
    {}
  )

  const result = boardColumns.map((col) => ({
    ...col,
    state_ids: statesByColumn[col.column_id] ?? [],
  }))

  return NextResponse.json(result)
}

// POST /api/boards/[id]/columns — create a column with state_ids
// Body: { name: string, state_ids: string[], position?: number, only_humans?: boolean, assigned_agents?: string[] }
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const { name, state_ids, position, only_humans, assigned_agents } = body as {
    name?: string
    state_ids?: string[]
    position?: number
    only_humans?: boolean
    assigned_agents?: string[]
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return errorResponse(400, 'name is required', undefined, undefined, 'VALIDATION_ERROR')
  }

  if (!state_ids || !Array.isArray(state_ids) || state_ids.length === 0) {
    return errorResponse(
      400,
      'state_ids is required and must be a non-empty array',
      undefined,
      undefined,
      'VALIDATION_ERROR'
    )
  }

  try {
    const column = await createColumn(id, {
      name: name.trim(),
      position: position ?? 0,
      state_ids,
      ...(only_humans !== undefined ? { only_humans } : {}),
      ...(assigned_agents ? { assigned_agents } : {}),
    })
    return NextResponse.json(column, { status: 201 })
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}
