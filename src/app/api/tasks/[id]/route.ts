import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/tasks/[id] — return full task detail including comments
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('task_id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PATCH /api/tasks/[id] — atomically append a comment via RPC
// Body: { comment: string }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()
  const { comment } = body

  if (!comment || typeof comment !== 'string' || !comment.trim()) {
    return NextResponse.json({ error: 'comment is required' }, { status: 400 })
  }

  // Use service role client — RLS may block RPC calls from anon key
  const supabase = createServiceRoleClient()

  const { error: rpcError } = await supabase.rpc('append_task_comment', {
    p_task_id: id,
    p_author:  'human',
    p_text:    comment.trim(),
  })

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 })
  }

  // Re-fetch updated task to return fresh state
  const { data, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('task_id', id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
