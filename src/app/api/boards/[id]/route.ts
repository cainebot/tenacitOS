import { NextRequest, NextResponse } from 'next/server'
import { getBoard, updateBoard, deleteBoard } from '@/lib/boards'

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

// GET /api/boards/[id] — return board with columns and state_ids
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    const board = await getBoard(id)
    return NextResponse.json(board)
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === 'PGRST116') {
      return errorResponse(404, 'Board not found', undefined, undefined, 'NOT_FOUND')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}

// PATCH /api/boards/[id] — update board fields
// Body: { name?: string, description?: string, card_type_filter?: CardType, state_filter?: string[] }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const { name, description, card_type_filter, state_filter, project_lead_agent_id } = body as {
    name?: string
    description?: string
    card_type_filter?: string
    state_filter?: string[]
    project_lead_agent_id?: string | null
  }

  if (!name && description === undefined && !card_type_filter && !state_filter && project_lead_agent_id === undefined) {
    return errorResponse(
      400,
      'At least one field is required',
      undefined,
      undefined,
      'VALIDATION_ERROR'
    )
  }

  const updateData: Parameters<typeof updateBoard>[1] = {}
  if (name) updateData.name = name.trim()
  if (description !== undefined) updateData.description = description
  if (card_type_filter !== undefined) {
    updateData.card_type_filter = card_type_filter as import('@/types/workflow').CardType
  }
  if (state_filter !== undefined) updateData.state_filter = state_filter
  if (project_lead_agent_id !== undefined) updateData.project_lead_agent_id = project_lead_agent_id

  try {
    const board = await updateBoard(id, updateData)
    return NextResponse.json(board)
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === 'PGRST116') {
      return errorResponse(404, 'Board not found', undefined, undefined, 'NOT_FOUND')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}

// DELETE /api/boards/[id] — delete a board
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    // Verify exists first
    await getBoard(id)
    await deleteBoard(id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === 'PGRST116') {
      return errorResponse(404, 'Board not found', undefined, undefined, 'NOT_FOUND')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}
