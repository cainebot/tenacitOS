import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/agents/[id]/photo — upload profile photo to Supabase Storage agent-avatars bucket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('photo') as File | null

  if (!file) {
    return NextResponse.json({ error: 'photo field is required' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }

  const MAX_SIZE = 2 * 1024 * 1024 // 2MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File size must be 2MB or less' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const storagePath = `${id}.png`
  const supabase = createServiceRoleClient()

  // Upload to Supabase Storage agent-avatars bucket (upsert to replace existing)
  const { error: uploadError } = await supabase.storage
    .from('agent-avatars')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('agent-avatars')
    .getPublicUrl(storagePath)

  // Fetch existing metadata to merge (do not overwrite other metadata fields)
  const { data: agentData } = await supabase
    .from('agents')
    .select('metadata')
    .eq('agent_id', id)
    .single()

  const existingMetadata = (agentData?.metadata as Record<string, unknown>) || {}

  // Update agent metadata with photo URL
  const { error: updateError } = await supabase
    .from('agents')
    .update({
      metadata: { ...existingMetadata, profile_photo_url: urlData.publicUrl },
    })
    .eq('agent_id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ photo_url: urlData.publicUrl })
}
