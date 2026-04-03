import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

interface HeartbeatConfig {
  interval_minutes?: number
  active_hours?: string
  active_days?: string[]
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params

  let body: HeartbeatConfig
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

  // Merge heartbeat_config slice into soul_config without clobbering other keys
  const existingSoulConfig = (current.soul_config as Record<string, unknown>) ?? {}
  const existingHeartbeatConfig = (existingSoulConfig.heartbeat_config as Partial<HeartbeatConfig>) ?? {}
  const mergedSoulConfig = {
    ...existingSoulConfig,
    heartbeat_config: { ...existingHeartbeatConfig, ...body },
  }

  // NOTE: Do NOT set soul_dirty — heartbeat config is operational metadata,
  // not identity content that triggers bridge regeneration
  const { data, error: updateError } = await supabase
    .from('agents')
    .update({ soul_config: mergedSoulConfig })
    .eq('agent_id', id)
    .select('soul_config')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    heartbeat_config: (data.soul_config as Record<string, unknown>)?.heartbeat_config ?? {},
  })
}
