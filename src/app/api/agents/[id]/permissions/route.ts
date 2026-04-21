import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import type { AgentPermissions } from '@/types/agents'

export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params

  let body: Partial<AgentPermissions>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Fetch current soul_config to merge into — never overwrite other keys
  const { data: current, error: fetchError } = await supabase
    .from('agents')
    .select('soul_config')
    .eq('agent_id', id)
    .single()

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Merge permissions slice into soul_config without clobbering other keys
  const existingSoulConfig = (current.soul_config as Record<string, unknown>) ?? {}
  const existingPermissions = (existingSoulConfig.permissions as Partial<AgentPermissions>) ?? {}
  const mergedSoulConfig = {
    ...existingSoulConfig,
    permissions: { ...existingPermissions, ...body },
  }

  const { data, error: updateError } = await supabase
    .from('agents')
    .update({ soul_config: mergedSoulConfig, soul_dirty: true })
    .eq('agent_id', id)
    .select('soul_config')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    permissions: (data.soul_config as Record<string, unknown>)?.permissions ?? {},
  })
}
