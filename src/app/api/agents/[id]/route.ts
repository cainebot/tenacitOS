import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Fields the UI is allowed to update — bridge-managed fields are excluded
const EDITABLE_FIELDS = ['about', 'skills', 'department_id', 'soul_config', 'badge', 'role'] as const
type EditableField = typeof EDITABLE_FIELDS[number]

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()

  // Fetch agent with department join
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('*, departments(display_name, color, icon, objective)')
    .eq('agent_id', id)
    .single()

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Fetch recent tasks involving this agent
  const { data: tasks } = await supabase
    .from('tasks')
    .select('task_id, title, status, type, created_at, completed_at')
    .or(`target_agent_id.eq.${id},source_agent_id.eq.${id}`)
    .order('updated_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ ...agent, recent_tasks: tasks ?? [] })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  // Filter to only editable fields — never touch bridge-managed fields
  const updates: Partial<Record<EditableField, unknown>> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No editable fields provided. Allowed: ' + EDITABLE_FIELDS.join(', ') },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('agent_id', id)
    .select('*, departments(display_name, color, icon)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
