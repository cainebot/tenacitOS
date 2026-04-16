import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/cards/[id]/task-messages — insert a human comment into task_messages
// Body: { content: string }
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: cardId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const { content } = body
  if (!content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ message: 'content is required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Step 1: Find or create task for this card
  let taskId: string

  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('task_id')
    .eq('card_id', cardId)
    .limit(1)

  if (existingTasks && existingTasks.length > 0) {
    taskId = existingTasks[0].task_id
  } else {
    // Create a lightweight task linked to this card
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({ card_id: cardId, title: 'Card thread', status: 'pending' })
      .select('task_id')
      .single()

    if (taskError || !newTask) {
      return NextResponse.json(
        { message: taskError?.message ?? 'Failed to create task' },
        { status: 500 },
      )
    }
    taskId = newTask.task_id
  }

  // Step 2: Get next seq number
  const { data: maxSeqRow } = await supabase
    .from('task_messages')
    .select('seq')
    .eq('task_id', taskId)
    .order('seq', { ascending: false })
    .limit(1)

  const nextSeq = (maxSeqRow && maxSeqRow.length > 0 ? maxSeqRow[0].seq : 0) + 1

  // Step 3: Insert task_message (actor_id=null means human)
  const { data: msg, error: msgError } = await supabase
    .from('task_messages')
    .insert({
      task_id: taskId,
      seq: nextSeq,
      message_type: 'text',
      actor_id: null,
      content: (content as string).trim(),
      metadata: {},
    })
    .select('*')
    .single()

  if (msgError) {
    return NextResponse.json(
      { message: msgError.message },
      { status: 500 },
    )
  }

  return NextResponse.json(msg, { status: 201 })
}
