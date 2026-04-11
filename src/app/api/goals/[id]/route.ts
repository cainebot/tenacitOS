import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import type { GoalRow } from '@/types/project'

// GET /api/goals/[id] — get single goal by goal_id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('goal_id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
      }
      console.error('[GET /api/goals/[id]] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data as GoalRow)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/goals/[id]] Unexpected error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH /api/goals/[id] — update goal fields
// Body: partial { title, description, status, parent_id }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const allowed = ['title', 'description', 'status', 'parent_id']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    )
  }

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('goal_id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
      }
      console.error('[PATCH /api/goals/[id]] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data as GoalRow)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[PATCH /api/goals/[id]] Unexpected error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/goals/[id] — delete goal (ON DELETE SET NULL handles FK cleanup)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('goal_id', id)

    if (error) {
      console.error('[DELETE /api/goals/[id]] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[DELETE /api/goals/[id]] Unexpected error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
