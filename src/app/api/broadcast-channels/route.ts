import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/broadcast-channels
// Returns all active broadcast channels (seeded at DB init)
// broadcast_channels has NO RLS — service_role required (per Phase 88-02 decision)
// Middleware mc_auth already verifies auth
export async function GET() {
  const supabase = createServiceRoleClient()

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
