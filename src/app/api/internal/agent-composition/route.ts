import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import {
  composeAgentPromptFiles,
  loadBundledAgentFile,
} from '@/lib/agent-composition'
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
    .select('agent_id, name, role, badge, about, soul_config, department_id, departments(display_name)')
    .eq('agent_id', agentId)
    .single()

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Get assigned skills for reconciliation.
  // desired_state=absent still needs to flow through confirm-install,
  // but it must not be rendered back into TOOLS.md.
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
    .order('created_at', { ascending: true })

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
  const presentSkills = skills.filter((skill) => skill.desired_state !== 'absent')

  // Load base soul template
  let baseTemplate = ''
  try {
    const templatePath = path.join(process.cwd(), '..', 'infrastructure', 'base-soul-template.md')
    baseTemplate = fs.readFileSync(templatePath, 'utf-8')
  } catch {
    // Template not found — bridge will use fallback
  }

  const bundledSoul = loadBundledAgentFile(agentId, 'SOUL.md')
  const bundledTools = loadBundledAgentFile(agentId, 'TOOLS.md')
  const department =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (agent.departments as any)?.display_name ?? null

  const { soulContent, toolsContent } = composeAgentPromptFiles({
    agent: {
      agent_id: agent.agent_id,
      name: agent.name,
      role: agent.role,
      badge: agent.badge,
      about: agent.about,
      department,
      soul_config:
        agent.soul_config && typeof agent.soul_config === 'object'
          ? (agent.soul_config as Record<string, unknown>)
          : null,
    },
    skills: presentSkills,
    baseTemplate,
    bundledSoul,
    bundledTools,
  })

  return NextResponse.json({
    agent: {
      agent_id: agent.agent_id,
      name: agent.name,
      role: agent.role,
      badge: agent.badge,
      about: agent.about,
      department,
    },
    all_skills: skills,
    present_skills: presentSkills,
    base_template: baseTemplate,
    soul_content: soulContent,
    tools_content: toolsContent,
  })
}
