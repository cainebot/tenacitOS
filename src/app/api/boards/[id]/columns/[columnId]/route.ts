import { NextRequest, NextResponse } from 'next/server'
import { updateColumn, deleteColumn } from '@/lib/boards'

type RouteParams = { params: Promise<{ id: string; columnId: string }> }

function errorResponse(
  status: number,
  message: string,
  details?: string,
  hint?: string,
  code?: string
) {
  return NextResponse.json({ message, details, hint, code }, { status })
}

// PATCH /api/boards/[id]/columns/[columnId] — update a column
// Body: { name?: string, position?: number, only_humans?: boolean, assigned_agents?: string[], state_ids?: string[] }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { columnId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const { name, position, only_humans, assigned_agents, state_ids } = body as {
    name?: string
    position?: number
    only_humans?: boolean
    assigned_agents?: string[]
    state_ids?: string[]
  }

  if (
    !name &&
    position === undefined &&
    only_humans === undefined &&
    !assigned_agents &&
    state_ids === undefined
  ) {
    return errorResponse(
      400,
      'At least one field is required',
      undefined,
      undefined,
      'VALIDATION_ERROR'
    )
  }

  const updateData: Parameters<typeof updateColumn>[1] = {}
  if (name) updateData.name = name.trim()
  if (position !== undefined) updateData.position = position
  if (only_humans !== undefined) updateData.only_humans = only_humans
  if (assigned_agents !== undefined) updateData.assigned_agents = assigned_agents
  if (state_ids !== undefined) updateData.state_ids = state_ids

  try {
    const column = await updateColumn(columnId, updateData)
    return NextResponse.json(column)
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === 'PGRST116') {
      return errorResponse(404, 'Column not found', undefined, undefined, 'NOT_FOUND')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}

// DELETE /api/boards/[id]/columns/[columnId] — delete a column
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { columnId } = await params

  try {
    await deleteColumn(columnId)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === 'PGRST116') {
      return errorResponse(404, 'Column not found', undefined, undefined, 'NOT_FOUND')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}
