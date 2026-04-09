import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/attachments/{id}/signed-url
// Returns a fresh signed URL for a single attachment by attachment_id.
// Used by ImageBubble onError to refresh stale signed URLs (D-01, D-02).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Look up the attachment's storage path
  const { data, error } = await supabase
    .from('message_attachments')
    .select('storage_path, filename, mime_type')
    .eq('attachment_id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
  }

  // Generate a fresh signed URL — 1-hour TTL matching existing pattern
  const { data: signedData, error: signedError } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(data.storage_path, 3600)

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })
  }

  return NextResponse.json({ url: signedData.signedUrl })
}
