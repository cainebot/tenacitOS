import { NextRequest, NextResponse } from 'next/server'
import { getProject, updateProject, deleteProject } from '@/lib/projects'

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

// GET /api/projects/[id] — return project with its states
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    const project = await getProject(id)
    return NextResponse.json(project)
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === 'PGRST116') {
      return errorResponse(404, 'Project not found', undefined, undefined, 'NOT_FOUND')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}

// PATCH /api/projects/[id] — update project name or description
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
    const project = await updateProject(id, updateData)
    return NextResponse.json(project)
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === 'PGRST116') {
      return errorResponse(404, 'Project not found', undefined, undefined, 'NOT_FOUND')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}

// DELETE /api/projects/[id] — delete project
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    // Verify exists first
    await getProject(id)
    await deleteProject(id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    if (e.code === 'PGRST116') {
      return errorResponse(404, 'Project not found', undefined, undefined, 'NOT_FOUND')
    }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}
