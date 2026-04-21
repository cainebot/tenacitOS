import { NextRequest, NextResponse } from 'next/server'
import { updateState, deleteState } from '@/lib/projects'
import { createServiceRoleClient } from '@/lib/supabase'
import type { StateCategory } from '@/types/project'

type RouteParams = { params: Promise<{ id: string; stateId: string }> }

const VALID_CATEGORIES: StateCategory[] = ['to-do', 'in_progress', 'done']

function errorResponse(
  status: number,
  message: string,
  details?: string,
  hint?: string,
  code?: string
) {
  return NextResponse.json({ message, details, hint, code }, { status })
}

// PATCH /api/projects/[id]/states/[stateId] — update a state
// Body: { name?: string, category?: StateCategory, color?: string, position?: number }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id, stateId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const { name, category, color, position } = body as {
    name?: string
    category?: string
    color?: string
    position?: number
  }

  if (!name && !category && !color && position === undefined) {
    return errorResponse(
      400,
      'At least one field is required',
      undefined,
      undefined,
      'VALIDATION_ERROR'
    )
  }

  if (category && !VALID_CATEGORIES.includes(category as StateCategory)) {
    return errorResponse(
      400,
      `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
      undefined,
      undefined,
      'VALIDATION_ERROR'
    )
  }

  // DB-05: Category coverage validation — cannot leave a category empty
  if (category) {
    const client = createServiceRoleClient()

    // Get current state's category
    const { data: currentState, error: fetchErr } = await client
      .from('project_states')
      .select('category')
      .eq('state_id', stateId)
      .single()

    if (fetchErr) {
      return errorResponse(404, 'State not found', undefined, undefined, 'NOT_FOUND')
    }

    // Only validate if category is actually changing
    if (currentState.category !== category) {
      const { count, error: countErr } = await client
        .from('project_states')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id)
        .eq('category', currentState.category)
        .neq('state_id', stateId)

      if (countErr) {
        return errorResponse(500, 'Failed to validate category coverage', countErr.message)
      }

      if (count === 0) {
        return errorResponse(
          409,
          `Cannot change category: '${currentState.category}' would have no remaining states`,
          `State '${stateId}' is the last state in category '${currentState.category}'`,
          'Add another state to this category first, or delete the state instead',
          'CATEGORY_EMPTY'
        )
      }
    }
  }

  const updateData: Partial<{
    name: string
    category: StateCategory
    color: string
    position: number
  }> = {}
  if (name) updateData.name = name.trim()
  if (category) updateData.category = category as StateCategory
  if (color) updateData.color = color
  if (position !== undefined) updateData.position = position

  try {
    const state = await updateState(stateId, updateData)
    return NextResponse.json(state)
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === 'PGRST116') {
      return errorResponse(404, 'State not found', undefined, undefined, 'NOT_FOUND')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}

// DELETE /api/projects/[id]/states/[stateId] — delete a state
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { stateId } = await params

  try {
    await deleteState(stateId)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === 'PGRST116') {
      return errorResponse(404, 'State not found', undefined, undefined, 'NOT_FOUND')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}
