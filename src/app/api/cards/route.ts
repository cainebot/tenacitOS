import { NextRequest, NextResponse } from 'next/server'
import { getCards, createCard } from '@/lib/cards'
import type { CardType, Priority } from '@/types/project'

// GET /api/cards — list cards with cursor-based pagination and filters
// Query params: board_id, workflow_id, state_id, card_type, assigned_agent_id,
//               parent_card_id, priority, labels (comma-separated), search,
//               cursor, limit (default 50, max 100)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const board_id = searchParams.get('board_id') ?? undefined
  const workflow_id = searchParams.get('workflow_id') ?? undefined
  const state_id = searchParams.get('state_id') ?? undefined
  const card_type = (searchParams.get('card_type') ?? undefined) as
    | CardType
    | undefined
  const assigned_agent_id =
    searchParams.get('assigned_agent_id') ?? undefined
  const parent_card_id = searchParams.get('parent_card_id') ?? undefined
  const priority = (searchParams.get('priority') ?? undefined) as
    | Priority
    | undefined
  const labelsParam = searchParams.get('labels')
  const labels = labelsParam
    ? labelsParam.split(',').map((l) => l.trim()).filter(Boolean)
    : undefined
  const search = searchParams.get('search') ?? undefined
  const cursor = searchParams.get('cursor') ?? undefined
  const limitParam = searchParams.get('limit')
  const limit = Math.min(
    limitParam ? parseInt(limitParam, 10) : 50,
    100
  )

  try {
    const page = await getCards({
      board_id,
      workflow_id,
      state_id,
      card_type,
      assigned_agent_id,
      parent_card_id,
      priority,
      labels,
      search,
      cursor,
      limit,
    })

    return NextResponse.json(page)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}

// POST /api/cards — create a new card
// Body: { title, workflow_id, state_id, card_type, ...optional fields }
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, state_id, card_type } = body
  const project_id = (body.project_id ?? body.workflow_id) as string | undefined

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ message: 'title is required' }, { status: 400 })
  }
  if (!project_id || typeof project_id !== 'string') {
    return NextResponse.json(
      { message: 'project_id (or workflow_id) is required' },
      { status: 400 }
    )
  }
  if (!state_id || typeof state_id !== 'string') {
    return NextResponse.json(
      { message: 'state_id is required' },
      { status: 400 }
    )
  }
  const validCardTypes: CardType[] = ['epic', 'story', 'task', 'subtask', 'bug']
  if (!card_type || !validCardTypes.includes(card_type as CardType)) {
    return NextResponse.json(
      {
        message: `card_type is required and must be one of: ${validCardTypes.join(', ')}`,
      },
      { status: 400 }
    )
  }

  try {
    const card = await createCard({
      title: (title as string).trim(),
      project_id: project_id as string,
      state_id: state_id as string,
      card_type: card_type as CardType,
      parent_card_id: (body.parent_card_id as string | undefined) ?? undefined,
      description: (body.description as string | undefined) ?? undefined,
      assigned_agent_id:
        (body.assigned_agent_id as string | undefined) ?? undefined,
      priority: (body.priority as Priority | undefined) ?? undefined,
      labels: Array.isArray(body.labels) ? (body.labels as string[]) : undefined,
      due_date: (body.due_date as string | undefined) ?? undefined,
      sort_order: (body.sort_order as string | undefined) ?? undefined,
    })

    return NextResponse.json(card, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('validate_card_hierarchy')) {
      return NextResponse.json(
        {
          message:
            'Card hierarchy violation: check that parent card type is compatible with this card_type',
          details: msg,
        },
        { status: 400 }
      )
    }
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}
