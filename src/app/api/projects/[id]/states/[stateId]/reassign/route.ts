import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

type RouteParams = { params: Promise<{ id: string; stateId: string }> }

function errorResponse(
  status: number,
  message: string,
  details?: string,
  hint?: string,
  code?: string
) {
  return NextResponse.json({ message, details, hint, code }, { status })
}

// POST /api/projects/[id]/states/[stateId]/reassign
// Body: { target_state_id: string }
// Returns: { reassigned_count: number }
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id, stateId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const { target_state_id } = body as { target_state_id?: string }

  if (!target_state_id) {
    return errorResponse(
      400,
      'target_state_id is required',
      undefined,
      'Provide the UUID of the state to reassign cards to',
      'VALIDATION_ERROR'
    )
  }

  if (target_state_id === stateId) {
    return errorResponse(
      400,
      'target_state_id cannot be the same as the source state',
      undefined,
      'Choose a different state to reassign cards to',
      'VALIDATION_ERROR'
    )
  }

  const client = createServiceRoleClient()

  const { data, error } = await client.rpc('reassign_and_delete_state', {
    p_state_id: stateId,
    p_target_state_id: target_state_id,
    p_project_id: id,
  })

  if (error) {
    // Map RPC RAISE EXCEPTION messages to appropriate HTTP status codes
    if (error.message.includes('Cannot delete last state of category')) {
      return errorResponse(
        409,
        error.message,
        undefined,
        'This is the last state in its category. Add another state to the category first.',
        'CATEGORY_CONSTRAINT'
      )
    }
    if (error.message.includes('not found in project')) {
      return errorResponse(
        404,
        error.message,
        undefined,
        'Verify both state IDs belong to this project',
        'NOT_FOUND'
      )
    }
    return errorResponse(500, error.message, error.details, error.hint, error.code)
  }

  return NextResponse.json({ reassigned_count: data ?? 0 })
}
