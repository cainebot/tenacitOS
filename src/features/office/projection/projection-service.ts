import type { AgentSpatialState, ProjectionInput } from '../types'

/**
 * resolveAgentState — pure function: business state -> spatial state
 *
 * Implements the 5-priority chain from arch doc section 5.2:
 *   Priority 1: Error
 *   Priority 2a: Working on task with board binding
 *   Priority 2b: Working on task without board binding (desk fallback)
 *   Priority 3: Thinking / queued
 *   Priority 4: Idle (covers 'idle', 'active', any other status)
 */
export function resolveAgentState(input: ProjectionInput): AgentSpatialState {
  const { agent, homeDesk, activeTasks, zoneBindings } = input

  // Priority 1: Error
  if (agent.status === 'error') {
    return {
      agentId: agent.agent_id,
      targetZoneId: homeDesk.zone_id,
      targetGridPos: { x: homeDesk.grid_x, y: homeDesk.grid_y },
      animationState: 'error',
      emote: 'error',
      chatBubble: null,
    }
  }

  // Priority 2: Working on executing task
  const executingTask = activeTasks.find(t => t.status === 'executing')
  if (executingTask) {
    // MVP: picks first project_board binding. Multi-board resolution deferred.
    const boardBinding = zoneBindings.find(
      b => b.binding_type === 'project_board' && b.board_id != null
    )
    const targetZone = boardBinding ?? homeDesk
    return {
      agentId: agent.agent_id,
      targetZoneId: targetZone.zone_id,
      targetGridPos: { x: targetZone.grid_x, y: targetZone.grid_y },
      animationState: 'working',
      emote: null,
      chatBubble: executingTask.description?.slice(0, 40) ?? null,
    }
  }

  // Priority 3: Thinking / queued
  if (agent.status === 'thinking' || agent.status === 'queued') {
    return {
      agentId: agent.agent_id,
      targetZoneId: homeDesk.zone_id,
      targetGridPos: { x: homeDesk.grid_x, y: homeDesk.grid_y },
      animationState: 'thinking',
      emote: 'thinking',
      chatBubble: null,
    }
  }

  // Priority 4: Idle (covers 'idle', 'active', any other status)
  return {
    agentId: agent.agent_id,
    targetZoneId: homeDesk.zone_id,
    targetGridPos: { x: homeDesk.grid_x, y: homeDesk.grid_y },
    animationState: 'idle',
    emote: null,
    chatBubble: null,
  }
}
