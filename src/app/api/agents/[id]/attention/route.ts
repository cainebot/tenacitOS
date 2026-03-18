import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/agents/[id]/attention — return attention count breakdown
// Returns total + breakdown of:
//   - unread_messages: inbound messages (sender_type='user') with read_at IS NULL
//   - failed_tasks: tasks assigned to this agent (target_agent_id) with status='failed'
//   - attention_cards: cards assigned to this agent with 'attention' label
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: agentId } = await params
  const supabase = createServerClient()

  try {
    // 1. Unread messages: messages addressed to this agent, sent by users, not yet read
    const { count: unreadMessages, error: msgErr } = await supabase
      .from('agent_messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_agent_id', agentId)
      .is('read_at', null)
      .eq('sender_type', 'user')

    if (msgErr) throw msgErr

    // 2. Failed tasks: tasks targeting this agent with status='failed'
    const { count: failedTasks, error: taskErr } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('target_agent_id', agentId)
      .eq('status', 'failed')

    if (taskErr) throw taskErr

    // 3. Cards needing attention: cards assigned to this agent with 'attention' label
    const { count: attentionCards, error: cardErr } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_agent_id', agentId)
      .contains('labels', ['attention'])

    if (cardErr) throw cardErr

    const total = (unreadMessages ?? 0) + (failedTasks ?? 0) + (attentionCards ?? 0)

    return NextResponse.json({
      total,
      unread_messages: unreadMessages ?? 0,
      failed_tasks: failedTasks ?? 0,
      attention_cards: attentionCards ?? 0,
    })
  } catch (err) {
    const e = err as Error
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
