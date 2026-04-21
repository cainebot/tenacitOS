import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { validateAgentKey } from '@/lib/agent-auth'

export const dynamic = 'force-dynamic'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:     ['in_progress'],
  claimed:     ['in_progress'],
  in_progress: ['blocked', 'completed'],
  blocked:     ['in_progress'],
}

const ALLOWED_BLOCK_CATEGORIES = ['external', 'internal', 'technical', 'human_approval']

export async function POST(request: NextRequest) {
  // 1. Auth
  const agentKey = request.headers.get('x-agent-key')
  if (!agentKey) {
    return NextResponse.json({ error: 'Missing X-Agent-Key' }, { status: 401 })
  }
  const { valid, agentId } = await validateAgentKey(agentKey)
  if (!valid || !agentId) {
    return NextResponse.json({ error: 'Invalid agent key' }, { status: 401 })
  }

  // 2. Parse body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { task_id, new_status, block_reason, block_category, result } = body

  // 3. Input validation
  if (!task_id || typeof task_id !== 'string') {
    return NextResponse.json({ error: 'task_id is required' }, { status: 400 })
  }
  if (!new_status || typeof new_status !== 'string') {
    return NextResponse.json({ error: 'new_status is required' }, { status: 400 })
  }
  if (!['blocked', 'completed', 'in_progress'].includes(new_status as string)) {
    return NextResponse.json({ error: 'new_status must be blocked, completed, or in_progress' }, { status: 400 })
  }
  if (new_status === 'blocked') {
    if (!block_reason || typeof block_reason !== 'string' || !(block_reason as string).trim()) {
      return NextResponse.json({ error: 'block_reason is required when blocking' }, { status: 400 })
    }
    if (block_category && (typeof block_category !== 'string' || !ALLOWED_BLOCK_CATEGORIES.includes(block_category))) {
      return NextResponse.json(
        { error: `block_category must be one of: ${ALLOWED_BLOCK_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }
  }

  const supabase = createServiceRoleClient()

  // 4. Fetch task with ownership guard — CRITICAL: always filter target_agent_id
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('task_id, status, card_id, target_agent_id')
    .eq('task_id', task_id as string)
    .eq('target_agent_id', agentId)
    .single()

  if (fetchError || !task) {
    return NextResponse.json({ error: 'Task not found or not assigned to you' }, { status: 404 })
  }

  // 5. Transition guard
  const allowed = ALLOWED_TRANSITIONS[task.status]
  if (!allowed || !allowed.includes(new_status as string)) {
    return NextResponse.json(
      { error: 'Transition not allowed', from: task.status, to: new_status },
      { status: 422 }
    )
  }

  // 6. Build update payload
  const updateData: Record<string, unknown> = { status: new_status }
  if (new_status === 'blocked') {
    updateData.block_reason = (block_reason as string).trim()
    if (block_category && typeof block_category === 'string') {
      updateData.block_category = block_category
    }
  }
  if (new_status === 'completed') {
    updateData.completed_at = new Date().toISOString()
    if (result && typeof result === 'object') {
      updateData.result = result
    }
  }
  if (new_status === 'in_progress' && task.status === 'blocked') {
    // Unblocking — clear block fields
    updateData.block_reason = null
    updateData.block_category = null
  }

  // 7. Write status update — sync_task_to_card trigger fires automatically for completed/failed
  const { error: updateError } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('task_id', task.task_id)
    .eq('target_agent_id', agentId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // 8. Handle blocked-specific side effects (NOT handled by sync_task_to_card trigger)
  if (new_status === 'blocked' && task.card_id) {
    // 8a. Fetch agent name for comment
    const { data: agent } = await supabase
      .from('agents')
      .select('name')
      .eq('agent_id', agentId)
      .single()

    const agentName = agent?.name ?? agentId

    // 8b. Post auto-comment on card (per D-12)
    const { error: commentError } = await supabase.rpc('append_card_comment', {
      p_card_id: task.card_id,
      p_author: agentId,
      p_text: `Tarea bloqueada por ${agentName}: ${(block_reason as string).trim()}`,
    })
    if (commentError) {
      console.error('[update-task-status] Failed to post block comment:', commentError.message)
    }

    // 8c. Update card agent_status to blocked (trigger doesn't handle this — per Pitfall 2)
    const { error: cardError } = await supabase
      .from('cards')
      .update({ agent_status: 'blocked' })
      .eq('card_id', task.card_id)
    if (cardError) {
      console.error('[update-task-status] Failed to update card agent_status:', cardError.message)
    }
  }

  return NextResponse.json({ success: true, task_id: task.task_id, status: new_status })
}
