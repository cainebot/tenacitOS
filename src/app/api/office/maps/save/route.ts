import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  // Auth: validate mc_auth cookie
  const authCookie = request.cookies.get('mc_auth')
  if (!authCookie || authCookie.value !== process.env.AUTH_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { mapId, mapJson, isDraft } = await request.json()

  if (!mapId || !mapJson) {
    return NextResponse.json({ message: 'Missing mapId or mapJson' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // 1. Get current highest version_num for this map
  const { data: latestVersion } = await supabase
    .from('office_map_versions')
    .select('version_num')
    .eq('map_id', mapId)
    .order('version_num', { ascending: false })
    .limit(1)
    .single()

  const nextVersionNum = (latestVersion?.version_num ?? 0) + 1

  // 2. INSERT new version row
  const { data: newVersion, error: insertErr } = await supabase
    .from('office_map_versions')
    .insert({
      map_id: mapId,
      version_num: nextVersionNum,
      map_json: mapJson,
      schema_version: '1.0',
    })
    .select('version_id')
    .single()

  if (insertErr || !newVersion) {
    console.error('[save] Insert failed:', insertErr)
    return NextResponse.json({ message: 'Save failed', error: insertErr?.message }, { status: 500 })
  }

  // 3. If publishing (not draft): update current_version_id on office_maps
  if (!isDraft) {
    const { error: updateErr } = await supabase
      .from('office_maps')
      .update({ current_version_id: newVersion.version_id })
      .eq('map_id', mapId)

    if (updateErr) {
      console.error('[save] Publish update failed:', updateErr)
      return NextResponse.json({ message: 'Version saved but publish failed', error: updateErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    versionId: newVersion.version_id,
    versionNum: nextVersionNum,
    isDraft,
  })
}
