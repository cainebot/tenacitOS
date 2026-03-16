import { NextRequest, NextResponse } from 'next/server'
import { getWorkflow, updateWorkflow, deleteWorkflow } from '@/lib/workflows'

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

// GET /api/workflows/[id] — return workflow with its states
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    const workflow = await getWorkflow(id)
    return NextResponse.json(workflow)
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === 'PGRST116') {
      return errorResponse(404, 'Workflow not found', undefined, undefined, 'NOT_FOUND')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}

// PATCH /api/workflows/[id] — update workflow name or description
// Body: { name?: string, description?: string }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const { name, description } = body as {
    name?: string
    description?: string
  }

  if (!name && description === undefined) {
    return errorResponse(
      400,
      'At least one field (name or description) is required',
      undefined,
      undefined,
      'VALIDATION_ERROR'
    )
  }

  const updateData: Partial<{ name: string; description: string }> = {}
  if (name) updateData.name = name.trim()
  if (description !== undefined) updateData.description = description

  try {
    const workflow = await updateWorkflow(id, updateData)
    return NextResponse.json(workflow)
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === 'PGRST116') {
      return errorResponse(404, 'Workflow not found', undefined, undefined, 'NOT_FOUND')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}

// DELETE /api/workflows/[id] — delete workflow
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    // Verify exists first
    await getWorkflow(id)
    await deleteWorkflow(id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === 'PGRST116') {
      return errorResponse(404, 'Workflow not found', undefined, undefined, 'NOT_FOUND')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}
