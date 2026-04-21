import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

type RouteParams = { params: Promise<{ id: string; attachmentId: string }> }

// DELETE /api/cards/[id]/attachments/[attachmentId] — remove file from Storage and delete DB record
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id, attachmentId } = await params
  const supabase = createServiceRoleClient()

  // Fetch the attachment record to get the storage_path
  const { data: attachment, error: fetchErr } = await supabase
    .from('card_attachments')
    .select('storage_path')
    .eq('attachment_id', attachmentId)
    .eq('card_id', id)
    .single()

  if (fetchErr) {
    if (fetchErr.code === 'PGRST116') {
      return NextResponse.json({ message: 'Attachment not found' }, { status: 404 })
    }
    return NextResponse.json({ message: fetchErr.message }, { status: 500 })
  }

  // Remove file from Supabase Storage — non-blocking, errors ignored
  await supabase.storage.from('attachments').remove([attachment.storage_path]).catch(() => {})

  // Delete DB record
  const { error: deleteErr } = await supabase
    .from('card_attachments')
    .delete()
    .eq('attachment_id', attachmentId)
    .eq('card_id', id)

  if (deleteErr) {
    return NextResponse.json({ message: deleteErr.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
