import { NextRequest, NextResponse } from 'next/server'
import { getProjects, getProjectBySlug, createProject, createState, generateSlug, resolveSlugCollision } from '@/lib/projects'
import { createBoard, createColumn } from '@/lib/boards'

function errorResponse(
  status: number,
  message: string,
  details?: string,
  hint?: string,
  code?: string
) {
  return NextResponse.json({ message, details, hint, code }, { status })
}

// GET /api/projects — return all projects, or single project by ?slug=X
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  try {
    if (slug) {
      const project = await getProjectBySlug(slug)
      if (!project) return errorResponse(404, 'Project not found', undefined, undefined, 'NOT_FOUND')
      return NextResponse.json(project)
    }
    const projects = await getProjects()
    return NextResponse.json(projects)
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}

// POST /api/projects — create project with full scaffolding (D-14)
// Body: { name: string, description?: string, cover_color?: string, cover_icon?: string }
// Returns: ProjectRow with slug (D-16)
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const { name, description, cover_color, cover_icon } = body as {
    name?: string
    description?: string
    cover_color?: string
    cover_icon?: string
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return errorResponse(400, 'name is required', undefined, undefined, 'VALIDATION_ERROR')
  }

  const trimmedName = name.trim()

  try {
    // 1. Generate slug with collision resolution (D-04)
    const baseSlug = generateSlug(trimmedName)
    const slug = await resolveSlugCollision(baseSlug)

    // 2. Create project with resolved slug
    const project = await createProject({
      name: trimmedName,
      slug,
      ...(description ? { description } : {}),
      ...(cover_color ? { cover_color } : {}),
      ...(cover_icon ? { cover_icon } : {}),
    })

    // 3. Create 3 default states (D-01, D-03)
    const stateConfigs = [
      { name: 'To Do',        category: 'to-do' as const,       color: '#6B7280', position: 0 },
      { name: 'In Progress',  category: 'in_progress' as const, color: '#3B82F6', position: 1 },
      { name: 'Done',         category: 'done' as const,        color: '#22C55E', position: 2 },
    ]

    const states = await Promise.all(
      stateConfigs.map((cfg) => createState(project.project_id, cfg))
    )

    // 4. Create board named after project (D-02)
    const board = await createBoard({
      project_id: project.project_id,
      name: trimmedName,
    })

    // 5. Create 3 columns linked to states (D-01)
    await Promise.all(
      states.map((state, i) =>
        createColumn(board.board_id, {
          name: state.name,
          position: i,
          state_ids: [state.state_id],
        })
      )
    )

    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    const e = err as Error & { code?: string; details?: string; hint?: string }
    return errorResponse(500, e.message, e.details, e.hint, e.code)
  }
}
