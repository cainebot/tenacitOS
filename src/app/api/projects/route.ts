import { NextRequest, NextResponse } from 'next/server'
import { getProjects, createProject } from '@/lib/projects'

function errorResponse(
  status: number,
  message: string,
  details?: string,
  hint?: string,
  code?: string
) {
  return NextResponse.json({ message, details, hint, code }, { status })
}

// GET /api/projects — return all projects ordered by name
export async function GET(_request: NextRequest) {
  try {
    const projects = await getProjects()
    return NextResponse.json(projects)
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}

// POST /api/projects — create a new project
// Body: { name: string, description?: string }
export async function POST(request: NextRequest) {
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

  if (!name || typeof name !== 'string' || !name.trim()) {
    return errorResponse(400, 'name is required', undefined, undefined, 'VALIDATION_ERROR')
  }

  try {
    const project = await createProject({
      name: name.trim(),
      ...(description ? { description } : {}),
    })
    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}
