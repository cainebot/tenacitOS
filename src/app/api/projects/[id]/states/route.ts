import { NextRequest, NextResponse } from 'next/server'
import { getProjectStates, createState } from '@/lib/projects'
import type { StateCategory } from '@/types/project'

type RouteParams = { params: Promise<{ id: string }> }

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

// GET /api/projects/[id]/states — return all states for a project
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    const states = await getProjectStates(id)
    return NextResponse.json(states)
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}

// POST /api/projects/[id]/states — create a new state
// Body: { name: string, category: StateCategory, color?: string, position?: number }
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

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

  if (!name || typeof name !== 'string' || !name.trim()) {
    return errorResponse(400, 'name is required', undefined, undefined, 'VALIDATION_ERROR')
  }

  if (!category || !VALID_CATEGORIES.includes(category as StateCategory)) {
    return errorResponse(
      400,
      `category is required and must be one of: ${VALID_CATEGORIES.join(', ')}`,
      undefined,
      undefined,
      'VALIDATION_ERROR'
    )
  }

  try {
    const state = await createState(id, {
      name: name.trim(),
      category: category as StateCategory,
      color: color ?? '#6B7280',
      position: position ?? 0,
    })
    return NextResponse.json(state, { status: 201 })
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}
