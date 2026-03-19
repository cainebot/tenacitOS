import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()

  const { data: skill, error } = await supabase
    .from('skills')
    .select(`
      *,
      skill_versions (id, version, content, install_spec, created_at),
      agent_skills (id, agent_id, skill_version_id, status, installed_at, created_at)
    `)
    .eq('id', id)
    .single()

  if (error || !skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  return NextResponse.json(skill)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceRoleClient()
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  for (const field of ['name', 'description', 'icon', 'origin', 'source_url'] as const) {
    if (field in body) updates[field] = body[field]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('skills')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceRoleClient()

  // v1.5.3: Safe deletion — check for assigned agents first
  const { data: assignments } = await supabase
    .from('agent_skills')
    .select('id, agent_id, status, desired_state')
    .eq('skill_id', id)

  const activeAssignments = (assignments ?? []).filter(
    a => a.status !== 'removed' && a.desired_state !== 'absent'
  )

  if (activeAssignments.length > 0) {
    // Mark all active assignments as desired_state=absent to trigger uninstall
    for (const assignment of activeAssignments) {
      await supabase
        .from('agent_skills')
        .update({ desired_state: 'absent', status: 'uninstalling' })
        .eq('id', assignment.id)
    }

    // Set soul_dirty on all affected agents so bridge recomposes TOOLS.md
    const agentIds = [...new Set(activeAssignments.map(a => a.agent_id))]
    for (const agentId of agentIds) {
      await supabase
        .from('agents')
        .update({ soul_dirty: true })
        .eq('agent_id', agentId)
    }

    // Mark skill as pending deletion — hides from marketplace immediately
    await supabase
      .from('skills')
      .update({ pending_deletion: true })
      .eq('id', id)

    return NextResponse.json({
      pending_deletion: true,
      skill_id: id,
      uninstalling_from: agentIds,
      message: 'Skill marked for deletion. Bridge will uninstall from all agents, then skill will be removed.',
    })
  }

  // No active assignments — safe to hard delete immediately
  // Check for any remaining rows (removed/absent) and clean them
  await supabase
    .from('agent_skills')
    .delete()
    .eq('skill_id', id)

  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: true, skill_id: id })
}
