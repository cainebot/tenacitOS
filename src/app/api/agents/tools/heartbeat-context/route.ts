import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { validateAgentKey } from '@/lib/agent-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const agentKey = request.headers.get('x-agent-key')
  if (!agentKey) {
    return NextResponse.json({ error: 'Missing X-Agent-Key' }, { status: 401 })
  }

  const { valid, agentId } = await validateAgentKey(agentKey)
  if (!valid || !agentId) {
    return NextResponse.json({ error: 'Invalid agent key' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.rpc('get_agent_heartbeat_context', {
    p_agent_id: agentId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
