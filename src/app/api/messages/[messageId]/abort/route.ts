import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ messageId: string }> }

// POST /api/messages/{messageId}/abort
// Sets abort_requested=true on the message so the daemon stops generation (Phase 102 D-09)
// The daemon polls this flag every ~500ms during streaming and sends chat.abort to the gateway.
export async function POST(
  _req: NextRequest,
  { params }: RouteContext
) {
  const { messageId } = await params

  if (!messageId) {
    return NextResponse.json({ error: 'messageId is required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('messages')
    .update({ abort_requested: true })
    .eq('message_id', messageId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
