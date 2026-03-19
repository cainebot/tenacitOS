import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerClient()

  // Get skills with latest version and agent count
  const { data: skills, error } = await supabase
    .from('skills')
    .select(`
      *,
      skill_versions (id, version, created_at),
      agent_skills (id, agent_id, status)
    `)
    .neq('pending_deletion', true)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with counts
  const enriched = (skills ?? []).map(skill => ({
    ...skill,
    version_count: skill.skill_versions?.length ?? 0,
    agent_count: skill.agent_skills?.length ?? 0,
    installed_count: skill.agent_skills?.filter((as: { status: string }) => as.status === 'installed').length ?? 0,
    latest_version: skill.skill_versions
      ?.sort((a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at))[0] ?? null,
  }))

  return NextResponse.json({ skills: enriched })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient()
  const body = await request.json()

  const { name, description, icon, origin, source_url, content, version } = body

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  // Create skill
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .insert({
      name,
      description: description ?? '',
      icon: icon ?? '🔧',
      origin: origin ?? 'local',
      source_url: source_url ?? null,
    })
    .select()
    .single()

  if (skillError) {
    return NextResponse.json({ error: skillError.message }, { status: 500 })
  }

  // Create initial version if content provided
  if (content) {
    const { error: versionError } = await supabase
      .from('skill_versions')
      .insert({
        skill_id: skill.id,
        version: version ?? '1.0.0',
        content,
      })

    if (versionError) {
      return NextResponse.json({ error: versionError.message }, { status: 500 })
    }
  }

  return NextResponse.json(skill, { status: 201 })
}
