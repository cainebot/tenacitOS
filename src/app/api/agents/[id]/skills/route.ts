import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('agent_skills')
    .select(`
      *,
      skills (id, name, description, icon, source),
      skill_versions (id, version, content)
    `)
    .eq('agent_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ agent_skills: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceRoleClient()
  const body = await request.json()

  const { skill_id, skill_version_id } = body

  if (!skill_id) {
    return NextResponse.json({ error: 'skill_id is required' }, { status: 400 })
  }

  // If no version specified, pick the latest
  let versionId = skill_version_id
  if (!versionId) {
    const { data: latest } = await supabase
      .from('skill_versions')
      .select('id')
      .eq('skill_id', skill_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    versionId = latest?.id ?? null
  }

  const { data, error } = await supabase
    .from('agent_skills')
    .insert({
      agent_id: id,
      skill_id,
      skill_version_id: versionId,
      status: 'pending',
    })
    .select(`
      *,
      skills (id, name, icon)
    `)
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Skill already assigned to this agent' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceRoleClient()
  const { searchParams } = new URL(request.url)
  const skillId = searchParams.get('skill_id')

  if (!skillId) {
    return NextResponse.json({ error: 'skill_id query param is required' }, { status: 400 })
  }

  // v1.5.1: Soft delete — mark desired_state=absent instead of hard delete.
  // Bridge will handle actual uninstall and mark as 'removed' after cleanup.
  const { error } = await supabase
    .from('agent_skills')
    .update({
      desired_state: 'absent',
      status: 'uninstalling',
    })
    .eq('agent_id', id)
    .eq('skill_id', skillId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ uninstalling: true, agent_id: id, skill_id: skillId })
}
