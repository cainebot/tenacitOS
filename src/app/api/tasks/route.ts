import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    title, type, target_agent_id, source_agent_id, priority, payload, max_retries,
    description, required_skills, labels, due_date,
  } = body

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const supabase = createServerClient()
  let resolvedTargetAgentId = target_agent_id || null

  // Normalise Phase 12 fields
  const requiredSkills: string[] = Array.isArray(required_skills) && required_skills.length > 0
    ? required_skills
    : []

  // Auto-routing: if no target_agent_id specified, pick least-busy idle agent
  if (!resolvedTargetAgentId) {
    // 1. Get all non-offline agents (include skills for skill-aware routing)
    const { data: agents } = await supabase
      .from('agents')
      .select('agent_id, name, status, skills')
      .neq('status', 'offline')

    if (agents && agents.length > 0) {
      // 2. Filter by required skills when specified
      const skillCandidates = requiredSkills.length > 0
        ? agents.filter((a: { skills?: string[] }) =>
            requiredSkills.every((s) => a.skills?.includes(s))
          )
        : agents

      const pool = skillCandidates.length > 0 ? skillCandidates : agents

      // 3. Count in-flight tasks (pending, claimed, in_progress) per agent
      const { data: taskCounts } = await supabase
        .from('tasks')
        .select('target_agent_id')
        .in('status', ['pending', 'claimed', 'in_progress'])

      const countByAgent = new Map<string, number>()
      for (const agent of pool) {
        countByAgent.set(agent.agent_id, 0)
      }
      if (taskCounts) {
        for (const t of taskCounts) {
          if (t.target_agent_id && countByAgent.has(t.target_agent_id)) {
            countByAgent.set(t.target_agent_id, (countByAgent.get(t.target_agent_id) || 0) + 1)
          }
        }
      }

      // 4. Prefer idle agents, then pick the one with fewest in-flight tasks
      const idleAgents = pool.filter((a: { status: string }) => a.status === 'idle')
      const candidates = idleAgents.length > 0 ? idleAgents : pool

      let bestAgent = candidates[0]
      let bestCount = countByAgent.get(bestAgent.agent_id) ?? Infinity
      for (const agent of candidates) {
        const count = countByAgent.get(agent.agent_id) ?? Infinity
        if (count < bestCount) {
          bestAgent = agent
          bestCount = count
        }
      }

      resolvedTargetAgentId = bestAgent.agent_id
    }
    // If no agents available at all, task stays with target_agent_id=null (unassigned)
  }

  const { data, error } = await supabase.from('tasks').insert({
    title,
    type: type || 'general',
    target_agent_id: resolvedTargetAgentId,
    source_agent_id: source_agent_id || null,
    priority: priority ?? 0,
    payload: payload ?? {},
    max_retries: max_retries ?? 0,
    status: 'pending',
    description: description?.trim() || null,
    required_skills: requiredSkills,
    labels: Array.isArray(labels) && labels.length > 0 ? labels : [],
    due_date: due_date || null,
  }).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
