import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'
import type { CardCommentRow } from '@/types/workflow'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/cards/[id]/comments — list all comments for a card
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('card_comments')
    .select('*')
    .eq('card_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json(data as CardCommentRow[])
}

// POST /api/cards/[id]/comments — append a comment via RPC (handles @mention notifications)
// Body: { author: string, text: string }
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const { author, text } = body

  if (!author || typeof author !== 'string' || !author.trim()) {
    return NextResponse.json(
      { message: 'author is required' },
      { status: 400 }
    )
  }
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ message: 'text is required' }, { status: 400 })
  }

  // Use service role — RLS may block RPC from anon key
  const supabase = createServiceRoleClient()

  // Call RPC which atomically appends comment and creates @mention notifications
  const { data: commentId, error: rpcError } = await supabase.rpc(
    'append_card_comment',
    {
      p_card_id: id,
      p_author: (author as string).trim(),
      p_text: (text as string).trim(),
    }
  )

  if (rpcError) {
    return NextResponse.json(
      { message: rpcError.message, code: rpcError.code },
      { status: 500 }
    )
  }

  // Re-fetch the new comment by its ID
  const { data: comment, error: fetchError } = await supabase
    .from('card_comments')
    .select('*')
    .eq('comment_id', commentId)
    .single()

  if (fetchError) {
    // RPC succeeded but re-fetch failed — return partial success
    return NextResponse.json(
      { comment_id: commentId, card_id: id },
      { status: 201 }
    )
  }

  return NextResponse.json(comment as CardCommentRow, { status: 201 })
}
