import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export async function PATCH(request: NextRequest) {
  // Auth: validate mc_auth cookie
  const authCookie = request.cookies.get('mc_auth')
  if (!authCookie || authCookie.value !== process.env.AUTH_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { zoneId, agentId, projectId, zoneType, boardId, roomCapability } = await request.json()
  if (!zoneId) {
    return NextResponse.json({ message: 'Missing zoneId' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const update: Record<string, unknown> = {}
  if (agentId !== undefined) update.agent_id = agentId
  if (projectId !== undefined) update.project_id = projectId
  if (zoneType !== undefined) update.zone_type = zoneType
  if (boardId !== undefined) update.board_id = boardId
  if (roomCapability !== undefined) update.room_capability = roomCapability

  const { error } = await supabase
    .from('office_zone_bindings')
    .update(update)
    .eq('zone_id', zoneId)

  if (error) {
    console.error('[zone-bindings] Update failed:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
