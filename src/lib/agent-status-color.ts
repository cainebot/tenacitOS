import type { AgentStatus } from '@/types/supabase'

/**
 * Maps all 7 AgentStatus values to a BadgeWithDot color.
 * Used by AgentCard and AgentTable for status badge rendering.
 */
export function agentStatusColor(status: AgentStatus): 'success' | 'indigo' | 'error' | 'gray' {
  switch (status) {
    case 'working':
    case 'executing_tool':
      return 'success'
    case 'idle':
    case 'thinking':
    case 'queued':
      return 'indigo'
    case 'error':
    case 'offline':
      return 'error'
    default:
      return 'gray'
  }
}
