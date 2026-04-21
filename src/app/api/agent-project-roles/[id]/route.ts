import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import type { AgentProjectRoleRow } from '@/types/project'

// PATCH /api/agent-project-roles/[id] — update reports_to and/or title
// Body: partial { reports_to, title, role }
// Catch cycle-detection trigger errors and return 422 with message
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const allowed = ['reports_to', 'title', 'role']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    )
  }

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('agent_project_roles')
      .update(updates)
      .eq('id', id)
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
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Agent project role not found' },
          { status: 404 }
        )
      }
      console.error(
        '[PATCH /api/agent-project-roles/[id]] Supabase error:',
        error
      )
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data as AgentProjectRoleRow)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(
      '[PATCH /api/agent-project-roles/[id]] Unexpected error:',
      msg
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/agent-project-roles/[id] — remove agent from project org chart
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('agent_project_roles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(
        '[DELETE /api/agent-project-roles/[id]] Supabase error:',
        error
      )
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(
      '[DELETE /api/agent-project-roles/[id]] Unexpected error:',
      msg
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
