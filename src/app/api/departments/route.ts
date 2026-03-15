import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('departments')
    .select('*, agents(count)')
    .order('sort_order')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, display_name, objective, color, icon, sort_order } = body

  if (!display_name) {
    return NextResponse.json({ error: 'display_name is required' }, { status: 400 })
  }

  // Auto-generate slug from display_name if name not provided
  const slug =
    name ||
    display_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('departments')
    .insert({
      name: slug,
      display_name,
      objective: objective ?? null,
      color: color ?? '#6B7280',
      icon: icon ?? '🏢',
      sort_order: sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
