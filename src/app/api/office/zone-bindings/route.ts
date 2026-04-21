import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export async function PATCH(request: NextRequest) {
  // Auth: validate mc_auth cookie
  const authCookie = request.cookies.get('mc_auth')
  if (!authCookie || authCookie.value !== process.env.AUTH_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { zoneId, agentId, projectId, zoneType, boardId, roomCapability, mapId } = await request.json()
  if (!zoneId) {
    return NextResponse.json({ message: 'Missing zoneId' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const fields: Record<string, unknown> = {}
  if (agentId !== undefined) fields.agent_id = agentId
  if (projectId !== undefined) fields.project_id = projectId
  if (zoneType !== undefined) fields.zone_type = zoneType
  if (boardId !== undefined) fields.board_id = boardId
  if (roomCapability !== undefined) fields.room_capability = roomCapability

  // Upsert: create binding if it doesn't exist for this zone_id
  // Required NOT NULL columns for INSERT: binding_type, grid_x, grid_y
  const { data, error } = await supabase
    .from('office_zone_bindings')
    .upsert(
      {
        zone_id: zoneId,
        map_id: mapId || '11111111-1111-1111-1111-111111111111',
        binding_type: fields.zone_type === 'office' ? 'project_board'
          : fields.zone_type === 'room' ? 'meeting_room'
          : 'agent_desk',
        grid_x: 0,
        grid_y: 0,
        ...fields,
      },
      { onConflict: 'map_id,zone_id', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (error) {
    console.error('[zone-bindings] Upsert failed:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, binding: data })
}
