import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import type { AgentProjectRoleRow } from '@/types/project'

// GET /api/agent-project-roles?project_id=UUID — list all roles for a project
// project_id is REQUIRED query param; return 400 if missing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const project_id = searchParams.get('project_id')

  if (!project_id) {
    return NextResponse.json(
      { error: 'project_id query parameter is required' },
      { status: 400 }
    )
  }

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('agent_project_roles')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[GET /api/agent-project-roles] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data as AgentProjectRoleRow[])
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/agent-project-roles] Unexpected error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/agent-project-roles — create agent role in project
// Body: { agent_id: string, project_id: string, reports_to?: string, title?: string, role?: string }
// The DB UNIQUE constraint on (agent_id, project_id) will reject duplicates — catch and return 409
// The cycle-detection trigger may raise an exception — catch and return 422 with the trigger's error message
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { agent_id, project_id, reports_to, title, role } = body as {
    agent_id?: string
    project_id?: string
    reports_to?: string
    title?: string
    role?: string
  }

  if (!agent_id || typeof agent_id !== 'string') {
    return NextResponse.json({ error: 'agent_id is required' }, { status: 400 })
  }

  if (!project_id || typeof project_id !== 'string') {
    return NextResponse.json(
      { error: 'project_id is required' },
      { status: 400 }
    )
  }

  try {
    const supabase = createServiceRoleClient()
    const payload: Record<string, unknown> = { agent_id, project_id }
    if (reports_to) payload.reports_to = reports_to
    if (title) payload.title = title
    if (role) payload.role = role

    const { data, error } = await supabase
      .from('agent_project_roles')
      .insert(payload)
      .select()
      .single()

    if (error) {
      // Cycle detection trigger error (PostgreSQL raises EXCEPTION)
      if (
        error.message.includes('cycle') ||
        error.message.includes('report to itself') ||
        error.message.includes('depth limit')
      ) {
        return NextResponse.json({ error: error.message }, { status: 422 })
      }
      // UNIQUE constraint violation: (agent_id, project_id) already exists
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Agent already has a role in this project' },
          { status: 409 }
        )
      }
      console.error('[POST /api/agent-project-roles] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data as AgentProjectRoleRow, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/agent-project-roles] Unexpected error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
