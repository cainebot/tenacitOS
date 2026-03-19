import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

export const dynamic = 'force-dynamic'

// Authenticate bridge requests via service role key
function validateServiceKey(request: NextRequest): boolean {
  const key = request.headers.get('x-service-key')
  return key === process.env.SUPABASE_SERVICE_ROLE_KEY
}

export async function GET(request: NextRequest) {
  if (!validateServiceKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('id')

  if (!agentId) {
    return NextResponse.json({ error: 'id query param is required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Get agent with department
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('agent_id, name, role, badge, about, department_id, departments(display_name)')
    .eq('agent_id', agentId)
    .single()

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Get ALL assigned skills (including those being uninstalled)
  const { data: agentSkills } = await supabase
    .from('agent_skills')
    .select(`
      id,
      status,
      desired_state,
      skills (id, name, icon),
      skill_versions (id, version, content, install_spec)
    `)
    .eq('agent_id', agentId)
    .not('status', 'eq', 'removed')

  // Build skills array with content
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const skills = (agentSkills ?? []).map((as: any) => ({
    name: as.skills?.name ?? 'unknown',
    icon: as.skills?.icon ?? '🔧',
    version: as.skill_versions?.version ?? '1.0.0',
    content: as.skill_versions?.content ?? '',
    install_spec: as.skill_versions?.install_spec ?? {},
    status: as.status,
    desired_state: as.desired_state ?? 'present',
    assignment_id: as.id,
  }))

  // Load base soul template
  let baseTemplate = ''
  try {
    const templatePath = path.join(process.cwd(), '..', 'infrastructure', 'base-soul-template.md')
    baseTemplate = fs.readFileSync(templatePath, 'utf-8')
  } catch {
    // Template not found — bridge will use fallback
  }

  return NextResponse.json({
    agent: {
      agent_id: agent.agent_id,
      name: agent.name,
      role: agent.role,
      badge: agent.badge,
      about: agent.about,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      department: (agent.departments as any)?.display_name ?? null,
    },
    skills,
    base_template: baseTemplate,
  })
}
