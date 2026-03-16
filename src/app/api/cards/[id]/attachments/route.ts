import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'
import type { CardAttachmentRow } from '@/types/workflow'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/cards/[id]/attachments — list all attachments for a card
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('card_attachments')
    .select('*')
    .eq('card_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json(data as CardAttachmentRow[])
}

// POST /api/cards/[id]/attachments — upload a file to Supabase Storage and record attachment
// Body: multipart/form-data with fields: file (File), uploaded_by? (string)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { message: 'Invalid multipart/form-data body' },
      { status: 400 }
    )
  }

  const file = formData.get('file') as File | null
  const uploadedBy = (formData.get('uploaded_by') as string | null) ?? null

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { message: 'file is required (multipart field named "file")' },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()

  // Ensure storage bucket exists — createBucket is idempotent
  await supabase.storage.createBucket('attachments', { public: false })

  // Generate unique storage path
  const storagePath = `card-attachments/${id}/${Date.now()}-${file.name}`

  // Upload file to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(storagePath, file)

  if (uploadError) {
    return NextResponse.json(
      { message: uploadError.message },
      { status: 500 }
    )
  }

  // Insert attachment record into card_attachments
  const { data: attachment, error: insertError } = await supabase
    .from('card_attachments')
    .insert({
      card_id: id,
      filename: file.name,
      mime_type: file.type || null,
      size_bytes: file.size || null,
      storage_path: storagePath,
      uploaded_by: uploadedBy,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json(
      { message: insertError.message },
      { status: 500 }
    )
  }

  return NextResponse.json(attachment as CardAttachmentRow, { status: 201 })
}
