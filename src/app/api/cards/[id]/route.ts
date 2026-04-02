import { NextRequest, NextResponse } from 'next/server'
import { getCard, updateCard, deleteCard } from '@/lib/cards'
import type { Priority, CardType } from '@/types/project'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/cards/[id] — return full CardDetail with attachments, comments, parent, children, breadcrumb
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    const card = await getCard(id)
    return NextResponse.json(card)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (
      (err as { code?: string })?.code === 'PGRST116' ||
      msg.includes('PGRST116')
    ) {
      return NextResponse.json({ message: 'Card not found' }, { status: 404 })
    }
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}

// PATCH /api/cards/[id] — update card fields (NOT state_id — use /move endpoint)
// Body: at least one of { title, description, assigned_agent_id, priority, labels, due_date, sort_order, parent_card_id }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  // Disallow state_id update via this endpoint
  if ('state_id' in body) {
    return NextResponse.json(
      {
        message:
          'Use PATCH /api/cards/:id/move to change state. state_id is not allowed here.',
      },
      { status: 400 }
    )
  }

  const allowed = [
    'title',
    'description',
    'assigned_agent_id',
    'priority',
    'labels',
    'due_date',
    'sort_order',
    'parent_card_id',
  ] as const

  const updateData: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) {
      updateData[key] = body[key]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { message: 'At least one field must be provided for update' },
      { status: 400 }
    )
  }

  try {
    const card = await updateCard(
      id,
      updateData as Partial<{
        title: string
        description: string
        assigned_agent_id: string
        priority: Priority
        labels: string[]
        due_date: string
        sort_order: string
        parent_card_id: string
        state_id: string
      }>
    )
    return NextResponse.json(card)
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
    if (
      (err as { code?: string })?.code === 'PGRST116' ||
      msg.includes('PGRST116')
    ) {
      return NextResponse.json({ message: 'Card not found' }, { status: 404 })
    }
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}

// DELETE /api/cards/[id] — delete card
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    await deleteCard(id)
    return new NextResponse(null, { status: 204 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (
      (err as { code?: string })?.code === 'PGRST116' ||
      msg.includes('PGRST116')
    ) {
      return NextResponse.json({ message: 'Card not found' }, { status: 404 })
    }
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}
