import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { validateAgentKey } from '@/lib/agent-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Auth block — validate agent key from header
  const agentKey = request.headers.get('x-agent-key')
  if (!agentKey) {
    return NextResponse.json({ error: 'Missing X-Agent-Key' }, { status: 401 })
  }

  const { valid, agentId } = await validateAgentKey(agentKey)
  if (!valid || !agentId) {
    return NextResponse.json({ error: 'Invalid agent key' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Query tasks scoped to this agent with card context
  // Use Supabase nested select for cards join
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('task_id, title, status, priority, block_reason, due_date, created_at, card_id, cards(title, code, goal_id)')
    .eq('target_agent_id', agentId)
    .in('status', ['pending', 'in_progress', 'blocked'])
    .order('priority', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Flatten card data into task summary shape
  const taskSummaries = (tasks ?? []).map((t: any) => ({
    task_id: t.task_id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    block_reason: t.block_reason,
    card_code: t.cards?.code ?? null,
    card_title: t.cards?.title ?? null,
    goal_id: t.cards?.goal_id ?? null,
    due_date: t.due_date,
    created_at: t.created_at,
  }))

  return NextResponse.json({ tasks: taskSummaries })
}
