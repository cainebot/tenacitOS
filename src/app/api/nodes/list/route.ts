import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/nodes/list — returns all nodes for workspace/node dropdown
export async function GET() {
  const supabase = createServerClient()

  // Phase 64.5.2 Plan 03: alias last_heartbeat_at -> last_heartbeat for legacy
  // consumers (layout.tsx etc.) AND expose the canonical _at suffix for plan 04.
  // Adds tailscale_*, deprovisioned_at, hostname, platform, available_adapters.
  const { data, error } = await supabase
    .from('nodes')
    .select(
      'node_id, hostname, status, agent_count, ram_usage_mb, ram_total_mb, ' +
      'last_heartbeat:last_heartbeat_at, last_heartbeat_at, ' +
      'tailscale_hostname, tailscale_ip, deprovisioned_at, platform, ' +
      'available_adapters, gateway_port, created_at, updated_at'
    )
    .order('node_id')

  if (error) {
    return NextResponse.json([], { status: 200 }) // graceful fallback
  }

  return NextResponse.json(data)
}
