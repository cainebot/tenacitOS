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

  // Update each agent_skill status
  for (const result of results) {
    const { assignment_id, status } = result
    if (!assignment_id || !['installed', 'failed'].includes(status)) continue

    const updates: Record<string, unknown> = { status }
    if (status === 'installed') {
      updates.installed_at = new Date().toISOString()
    }

    await supabase
      .from('agent_skills')
      .update(updates)
      .eq('id', assignment_id)
  }

  // Build the skills snapshot from installed skills
  const { data: installedSkills } = await supabase
    .from('agent_skills')
    .select('skills (name)')
    .eq('agent_id', agent_id)
    .eq('status', 'installed')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const skillNames = (installedSkills ?? [])
    .map((as: any) => as.skills?.name)
    .filter(Boolean)

  // Update agents.skills snapshot and clear soul_dirty
  const allSucceeded = results.every((r: { status: string }) => r.status === 'installed')

  const agentUpdates: Record<string, unknown> = {
    skills: skillNames,
  }
  // Only clear soul_dirty if all results succeeded
  if (allSucceeded) {
    agentUpdates.soul_dirty = false
  }

  await supabase
    .from('agents')
    .update(agentUpdates)
    .eq('agent_id', agent_id)

  return NextResponse.json({
    agent_id,
    skills_snapshot: skillNames,
    soul_dirty_cleared: allSucceeded,
    results_processed: results.length,
  })
}
