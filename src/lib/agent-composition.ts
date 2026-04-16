import * as fs from 'fs'
import * as path from 'path'

export interface AgentCompositionIdentity {
  agent_id: string
  name: string
  role?: string | null
  badge?: string | null
  about?: string | null
  department?: string | null
  soul_config?: Record<string, unknown> | null
  // Phase 91: personality framework extensions
  emoji?: string | null
  vibe?: string | null
  avatar_url?: string | null
  node_id?: string | null
  reports_to_agent_id?: string | null
  created_at?: string | null
  personality_doc?: {
    core_truths?: string[]
    boundaries?: string[]
    vibe?: string
    continuity?: string[]
  } | null
  heartbeat_checklists?: {
    on_wake?: string[]
    on_idle?: string[]
    on_completion?: string[]
  } | null
}

// Phase 91: lightweight roster entry for MEMORY.md "People & Relationships"
export interface AgentRosterEntry {
  agent_id: string
  name: string
  role?: string | null
}

export interface AgentCompositionSkill {
  name: string
  icon: string
  version: string
  content: string
  install_spec: Record<string, unknown>
  status: string
  assignment_id: string
}

const MANAGED_SKILLS_BEGIN = '<!-- OPENCLAW:INSTALLED_SKILLS:BEGIN -->'
const MANAGED_SKILLS_END = '<!-- OPENCLAW:INSTALLED_SKILLS:END -->'

function loadOptionalFile(filePath: string): string {
  try {
    if (!fs.existsSync(filePath)) return ''
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return ''
  }
}

function stripManagedSkillsSection(content: string): string {
  if (!content) return ''

  const start = content.indexOf(MANAGED_SKILLS_BEGIN)
  const end = content.indexOf(MANAGED_SKILLS_END)

  if (start === -1 || end === -1 || end < start) {
    return content.trimEnd()
  }

  const before = content.slice(0, start).trimEnd()
  const after = content.slice(end + MANAGED_SKILLS_END.length).trimStart()

  if (before && after) {
    return `${before}\n\n${after}`.trimEnd()
  }

  return `${before}${after}`.trimEnd()
}

function buildFallbackSoul(agent: AgentCompositionIdentity, baseTemplate: string): string {
  const name = agent.name || agent.agent_id || 'Unknown Agent'
  const role = agent.role || 'specialist'
  const badge = agent.badge || 'SPC'
  const department = agent.department || 'Unassigned'
  const about = agent.about?.trim() || ''
  const personality =
    typeof agent.soul_config?.personality === 'string'
      ? agent.soul_config.personality.trim()
      : ''

  const parts: string[] = []

  if (baseTemplate.trim()) {
    parts.push(baseTemplate.trim())
    parts.push('')
    parts.push('---')
    parts.push('')
  }

  parts.push(`# Agent: ${name}`)
  parts.push(`**Role:** ${role} | **Badge:** ${badge} | **Department:** ${department}`)
  parts.push('')

  if (about) {
    parts.push('## About')
    parts.push(about)
    parts.push('')
  }

  if (personality) {
    parts.push('## Personality')
    parts.push(personality)
    parts.push('')
  }

  parts.push('## Runtime Layout')
  parts.push('Identity, behavior, and boundaries live in this file.')
  parts.push('Installed skills and operational tool payloads live in `TOOLS.md`.')

  return `${parts.join('\n').trimEnd()}\n`
}

function buildManagedSkillsSection(skills: AgentCompositionSkill[]): string {
  const lines: string[] = [
    MANAGED_SKILLS_BEGIN,
    '## Installed Skills',
    '',
    'This section is managed by Mission Control skill assignments.',
    'Keep agent identity in `SOUL.md`; keep installable capability payloads here.',
    '',
  ]

  if (skills.length === 0) {
    lines.push('_No installed skills assigned._')
  } else {
    for (const skill of skills) {
      lines.push(`### ${skill.icon} ${skill.name} (v${skill.version})`)
      lines.push('')
      lines.push(skill.content.trim() || '_No content provided for this skill version._')
      lines.push('')
    }
  }

  lines.push(MANAGED_SKILLS_END)
  return lines.join('\n').trim()
}

function buildToolsContent(
  agent: AgentCompositionIdentity,
  bundledTools: string,
  skills: AgentCompositionSkill[]
): string {
  const baseTools = stripManagedSkillsSection(bundledTools)
  const managedSkills = buildManagedSkillsSection(skills)

  if (baseTools.trim()) {
    return `${baseTools.trimEnd()}\n\n---\n\n${managedSkills}\n`
  }

  const name = agent.name || agent.agent_id || 'Unknown Agent'
  return [
    `# Tools - ${name}`,
    '',
    'Technical reference and installed skill payloads for this agent.',
    '',
    '---',
    '',
    managedSkills,
    '',
  ].join('\n')
}

export function loadBundledAgentFile(
  agentId: string,
  fileName: 'SOUL.md' | 'TOOLS.md'
): string {
  const filePath = path.join(process.cwd(), '..', 'agents', agentId, fileName)
  return loadOptionalFile(filePath)
}

export function composeAgentPromptFiles(params: {
  agent: AgentCompositionIdentity
  skills: AgentCompositionSkill[]
  baseTemplate: string
  bundledSoul: string
  bundledTools: string
}): { soulContent: string; toolsContent: string } {
  const fallbackSoul = buildFallbackSoul(params.agent, params.baseTemplate)
  const soulBase = stripManagedSkillsSection(params.bundledSoul)

  // Phase 91 (D-02 + Pitfall #6): committed agents/{id}/SOUL.md contains only
  // the 4 canonical sections; Base Protocol is prepended here at composition time
  // so the rendered soul_content always starts with Base Protocol.
  let soulContent: string
  if (soulBase.trim()) {
    const base = params.baseTemplate.trim()
    if (base && !soulBase.includes(base.split('\n')[0]?.trim() ?? '')) {
      soulContent = `${base}\n\n---\n\n${soulBase.trimEnd()}\n`
    } else {
      soulContent = `${soulBase.trimEnd()}\n`
    }
  } else {
    soulContent = `${fallbackSoul.trimEnd()}\n`
  }

  const toolsContent = buildToolsContent(params.agent, params.bundledTools, params.skills)

  return { soulContent, toolsContent }
}

// ============================================================
// Phase 91: Personality Framework renderers
// ============================================================

export function renderIdentityMarkdown(agent: AgentCompositionIdentity): string {
  return [
    `# IDENTITY — ${agent.name}`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Name** | ${agent.name} |`,
    `| **Role** | ${agent.role ?? '—'} |`,
    `| **Vibe** | ${agent.vibe ?? '—'} |`,
    `| **Emoji** | ${agent.emoji ?? '—'} |`,
    `| **Avatar URL** | ${agent.avatar_url ?? '—'} |`,
    `| **Node** | ${agent.node_id ?? '—'} |`,
    `| **Reports To** | ${agent.reports_to_agent_id ?? 'Joan (human)'} |`,
    ``,
    `---`,
    `_This file is generated from Supabase \`agents\` table and overwritten by the bridge on \`soul_dirty=true\`. Do not edit manually._`,
  ].join('\n')
}

export function renderHeartbeatMarkdown(agent: AgentCompositionIdentity): string {
  const hc = agent.heartbeat_checklists ?? {}
  const on_wake = hc.on_wake ?? []
  const on_idle = hc.on_idle ?? []
  const on_completion = hc.on_completion ?? []
  return [
    `# HEARTBEAT — ${agent.name}`,
    ``,
    `## on_wake`,
    ...on_wake.map((s) => `- ${s}`),
    ``,
    `## on_idle`,
    ...on_idle.map((s) => `- ${s}`),
    ``,
    `## on_completion`,
    ...on_completion.map((s) => `- ${s}`),
  ].join('\n')
}

export function renderMemorySeed(
  agent: AgentCompositionIdentity,
  departmentDisplayName: string | null,
  otherAgents: AgentRosterEntry[]
): string {
  const joined = agent.created_at
    ? new Date(agent.created_at).toISOString().slice(0, 10)
    : 'unknown'
  const peopleLines = otherAgents
    .filter((a) => a.agent_id !== agent.agent_id && a.agent_id !== 'pomni')
    .map((a) => `- **${a.name}** — ${a.role ?? 'agent'}.`)
  return [
    `# MEMORY — ${agent.name}`,
    ``,
    `> This file is YOUR persistent memory. It lives only on your node and is`,
    `> seeded by the bridge on first boot. Once seeded, it is never overwritten.`,
    ``,
    `## Durable Facts`,
    `- **agent_id:** \`${agent.agent_id}\``,
    `- **Role:** ${agent.role ?? '—'}`,
    `- **Department:** ${departmentDisplayName ?? '—'}`,
    `- **Node:** ${agent.node_id ?? '—'}`,
    `- **Reports to:** ${agent.reports_to_agent_id ?? 'Joan (human)'}`,
    `- **Joined:** ${joined}`,
    `- **Golden Rule:** Never send external communications without explicit human approval.`,
    ``,
    `## Recent Learnings`,
    `_No entries yet._`,
    ``,
    `## People & Relationships`,
    `- **Joan** — Product Owner (human). Feedback routes through pomni.`,
    `- **pomni** — Scrum Master. Hub for all inter-agent communication.`,
    ...peopleLines,
    ``,
    `## Active Context`,
    `- **Boards:** _populated on first assignment_`,
    `- **Active epics:** _populated on first assignment_`,
  ].join('\n')
}
