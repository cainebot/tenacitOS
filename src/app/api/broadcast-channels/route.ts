import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/broadcast-channels
// Returns all active broadcast channels (seeded at DB init)
// broadcast_channels has NO RLS — service_role required (per Phase 88-02 decision)
export async function GET() {
  const supabase = createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('broadcast_channels')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
