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

  // CASCADE handles skill_versions and agent_skills cleanup
  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: true, skill_id: id })
}
