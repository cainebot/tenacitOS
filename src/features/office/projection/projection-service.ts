import type { AgentSpatialState, EphemeralOverride, ProjectionInput } from '../types'

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
  const executingTask = activeTasks.find(t => t.status === 'in_progress')
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

/**
 * mergeProjection — combines durable projection with ephemeral override.
 *
 * ADR-009: Two-layer model with forced expiry.
 * Precedence rules:
 *   1. Error state always wins — ephemeral cannot override an error.
 *   2. No ephemeral → return durable unchanged.
 *   3. TTL expired → return durable (ephemeral discarded).
 *   4. Valid ephemeral → overlay targetZoneId + publicState, source='ephemeral'.
 *      Durable fields (agentId, targetGridPos, animationState, emote, chatBubble, badge) are preserved.
 */
export function mergeProjection(
  durable: AgentSpatialState,
  ephemeral: EphemeralOverride | null
): AgentSpatialState {
  // Error always overrides ephemeral — durable error state is authoritative
  if (durable.publicState === 'error') return durable
  if (!ephemeral) return durable

  const elapsed = (Date.now() - ephemeral.started_at) / 1000
  if (elapsed > ephemeral.ttl_seconds) return durable  // TTL expired

  return {
    ...durable,
    targetZoneId: ephemeral.targetZoneId,
    publicState: ephemeral.publicState,
    source: 'ephemeral',
  }
}
