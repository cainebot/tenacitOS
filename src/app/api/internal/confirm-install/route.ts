import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function validateServiceKey(request: NextRequest): boolean {
  const key = request.headers.get('x-service-key')
  return key === process.env.SUPABASE_SERVICE_ROLE_KEY
}

export async function POST(request: NextRequest) {
  if (!validateServiceKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { agent_id, results } = body

  if (!agent_id || !Array.isArray(results)) {
    return NextResponse.json(
      { error: 'agent_id and results[] are required' },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()
  const now = new Date().toISOString()

  // Update each agent_skill status
  for (const result of results) {
    const { assignment_id, status, error: installError } = result
    const validStatuses = ['installed', 'failed', 'removed', 'uninstall_failed']
    if (!assignment_id || !validStatuses.includes(status)) continue

    const updates: Record<string, unknown> = {
      status,
      last_attempted_at: now,
    }
    if (status === 'installed') {
      updates.installed_at = now
      updates.last_error = null
    }
    if (status === 'failed' || status === 'uninstall_failed') {
      updates.last_error = installError || 'Unknown error'
    }
    if (status === 'removed') {
      updates.installed_at = null
      updates.last_error = null
    }

    await supabase
      .from('agent_skills')
      .update(updates)
      .eq('id', assignment_id)
  }

  // v1.5.1: Build skills snapshot from installed skills only
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: installedSkills } = await supabase
    .from('agent_skills')
    .select('skills (name)')
    .eq('agent_id', agent_id)
    .eq('status', 'installed')
    .eq('desired_state', 'present')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const skillNames = (installedSkills ?? [])
    .map((as: any) => as.skills?.name)
    .filter(Boolean)

  // v1.5.1: Check FULL convergence — desired_state must match status for ALL skills
  // Only clear soul_dirty if every skill has converged
  const { data: allAgentSkills } = await supabase
    .from('agent_skills')
    .select('desired_state, status')
    .eq('agent_id', agent_id)

  const converged = (allAgentSkills ?? []).every((as: { desired_state: string; status: string }) => {
    if (as.desired_state === 'present') return as.status === 'installed'
    if (as.desired_state === 'absent') return as.status === 'removed'
    return false
  })

  const agentUpdates: Record<string, unknown> = {
    skills: skillNames,
  }
  if (converged) {
    agentUpdates.soul_dirty = false
  }

  await supabase
    .from('agents')
    .update(agentUpdates)
    .eq('agent_id', agent_id)

  // Clean up fully removed rows (desired_state=absent, status=removed)
  if (converged) {
    await supabase
      .from('agent_skills')
      .delete()
      .eq('agent_id', agent_id)
      .eq('desired_state', 'absent')
      .eq('status', 'removed')
  }

  return NextResponse.json({
    agent_id,
    skills_snapshot: skillNames,
    converged,
    soul_dirty_cleared: converged,
    results_processed: results.length,
  })
}
