import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { CardActivityRow } from '@/types/project'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/cards/[id]/activity — list all activity events for a card
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('card_activity')
    .select('*')
    .eq('card_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json(data as CardActivityRow[])
}
