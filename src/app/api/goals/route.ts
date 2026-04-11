import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import type { GoalLevel, GoalRow } from '@/types/project'

// GET /api/goals — list all goals (company + department), ordered by level then title
// Query: optional ?level=company|department filter
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const levelParam = searchParams.get('level') as GoalLevel | null

  try {
    const supabase = createServiceRoleClient()
    let query = supabase
      .from('goals')
      .select('*')
      .order('level', { ascending: true })
      .order('title', { ascending: true })

    if (levelParam) {
      if (levelParam !== 'company' && levelParam !== 'department') {
        return NextResponse.json(
          { error: 'level must be "company" or "department"' },
          { status: 400 }
        )
      }
      query = query.eq('level', levelParam)
    }

    const { data, error } = await query

    if (error) {
      console.error('[GET /api/goals] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data as GoalRow[])
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/goals] Unexpected error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/goals — create a new goal
// Body: { title: string, description?: string, level: 'company' | 'department', parent_id?: string }
// Validation: title required, level must be company|department
// If level is 'department' and parent_id is missing, return 400
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, description, level, parent_id } = body as {
    title?: string
    description?: string
    level?: string
    parent_id?: string
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  if (!level || (level !== 'company' && level !== 'department')) {
    return NextResponse.json(
      { error: 'level is required and must be "company" or "department"' },
      { status: 400 }
    )
  }

  if (level === 'department' && !parent_id) {
    return NextResponse.json(
      { error: 'Department goals require a parent_id' },
      { status: 400 }
    )
  }

  try {
    const supabase = createServiceRoleClient()
    const payload: Record<string, unknown> = {
      title: title.trim(),
      level,
    }
    if (description) payload.description = description
    if (parent_id) payload.parent_id = parent_id

    const { data, error } = await supabase
      .from('goals')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('[POST /api/goals] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data as GoalRow, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/goals] Unexpected error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
