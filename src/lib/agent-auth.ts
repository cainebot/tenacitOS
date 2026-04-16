import * as bcrypt from 'bcryptjs'
import { createServiceRoleClient } from './supabase'

const BCRYPT_ROUNDS = 12
const KEY_PREFIX = 'ock_live_'

export async function generateAgentKey(): Promise<{ plainKey: string; hash: string }> {
  const randomPart = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const plainKey = `${KEY_PREFIX}${randomPart}`
  const hash = await bcrypt.hash(plainKey, BCRYPT_ROUNDS)
  return { plainKey, hash }
}

export async function validateAgentKey(key: string): Promise<{ valid: boolean; agentId: string | null }> {
  if (!key || !key.startsWith(KEY_PREFIX)) {
    return { valid: false, agentId: null }
  }

  const supabase = createServiceRoleClient()
  const { data: agents, error } = await supabase
    .from('agents')
    .select('agent_id, api_key_hash')
    .not('api_key_hash', 'is', null)

  if (error || !agents) {
    console.error('[agent-auth] Failed to query agents:', error)
    return { valid: false, agentId: null }
  }

  for (const agent of agents) {
    const match = await bcrypt.compare(key, agent.api_key_hash)
    if (match) {
      return { valid: true, agentId: agent.agent_id }
    }
  }

  return { valid: false, agentId: null }
}
