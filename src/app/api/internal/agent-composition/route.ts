import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import {
  composeAgentPromptFiles,
  loadBundledAgentFile,
  renderIdentityMarkdown,
  renderHeartbeatMarkdown,
  renderMemorySeed,
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

  // Get agent with department — Phase 91 adds personality_doc, heartbeat_checklists,
  // vibe, avatar_url, reports_to_agent_id, emoji, node_id, created_at
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('agent_id, name, role, badge, about, soul_config, department_id, emoji, node_id, created_at, vibe, avatar_url, reports_to_agent_id, personality_doc, heartbeat_checklists, departments(display_name)')
    .eq('agent_id', agentId)
    .single()

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Phase 91: lightweight roster for MEMORY.md People & Relationships section
  const { data: otherAgents } = await supabase
    .from('agents')
    .select('agent_id, name, role')
    .neq('agent_id', agent.agent_id)

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const personalityDoc = (agent as any).personality_doc ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heartbeatChecklists = (agent as any).heartbeat_checklists ?? null

  const identityAgent = {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emoji: (agent as any).emoji ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vibe: (agent as any).vibe ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    avatar_url: (agent as any).avatar_url ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    node_id: (agent as any).node_id ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reports_to_agent_id: (agent as any).reports_to_agent_id ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    created_at: (agent as any).created_at ?? null,
    personality_doc: personalityDoc,
    heartbeat_checklists: heartbeatChecklists,
  }

  const { soulContent, toolsContent } = composeAgentPromptFiles({
    agent: identityAgent,
    skills: presentSkills,
    baseTemplate,
    bundledSoul,
    bundledTools,
  })

  // Phase 91: render 3 new markdown payloads
  const identityContent = renderIdentityMarkdown(identityAgent)
  const heartbeatContent = renderHeartbeatMarkdown(identityAgent)
  const memorySeed = renderMemorySeed(
    identityAgent,
    department,
    (otherAgents ?? []).map((a) => ({
      agent_id: a.agent_id,
      name: a.name,
      role: a.role,
    }))
  )

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
    // Phase 91: personality framework payloads
    identity_content: identityContent,
    heartbeat_content: heartbeatContent,
    memory_seed: memorySeed,
  })
}
