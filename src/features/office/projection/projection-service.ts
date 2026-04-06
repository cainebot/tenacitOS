import type { AgentSpatialState, DurableInput, EphemeralOverride, ProjectionInput } from '../types'

/**
 * resolveDurable — pure function: business state -> spatial state (v2)
 *
 * Implements the 4-priority chain for board_id-aware durable projection:
 *   P1: Error      -> desk (or {x:0,y:0} if no desk), publicState='error'
 *   P2: Executing  -> Office zone by board_id match; overloaded on multi-board conflict
 *   P3: Thinking   -> desk (or {x:0,y:0}), publicState='waiting'
 *   P4: Idle       -> WANDER (targetZoneId=null), publicState='idle'
 *
 * All outputs include source='durable'.
 * Null homeDesk is handled gracefully with {x:0,y:0} fallback (Pitfall 6).
 */
export function resolveDurable(input: DurableInput): AgentSpatialState {
  const { agent, homeDesk, activeTasks, zoneBindings } = input

  // Helper for desk-bound states — handles null homeDesk gracefully (Pitfall 6)
  const deskPos = homeDesk
    ? { targetZoneId: homeDesk.zone_id, targetGridPos: { x: homeDesk.grid_x, y: homeDesk.grid_y } }
    : { targetZoneId: null as string | null, targetGridPos: { x: 0, y: 0 } }

  // P1: Error -> Desk + error
  if (agent.status === 'error') {
    return {
      agentId: agent.agent_id,
      ...deskPos,
      animationState: 'error',
      emote: 'error',
      chatBubble: null,
      publicState: 'error',
      badge: null,
      source: 'durable',
    }
  }

  // P2: Executing task(s) — status 'in_progress' is the DB value for "executing"
  const executing = activeTasks.filter(t => t.status === 'in_progress')
  if (executing.length > 0) {
    const boards = new Set(executing.map(t => t.board_id).filter(Boolean))
    if (boards.size > 1) {
      // Multi-board conflict -> Desk + overloaded
      return {
        agentId: agent.agent_id,
        ...deskPos,
        animationState: 'working',
        publicState: 'overloaded',
        emote: null,
        chatBubble: null,
        badge: 'Context conflict \u2014 multiple boards',
        source: 'durable',
      }
    }
    const task = executing[0]
    if (task.board_id) {
      const office = zoneBindings.find(
        b => (b.zone_type === 'office' || b.binding_type === 'project_board') && b.board_id === task.board_id
      )
      if (office) {
        return {
          agentId: agent.agent_id,
          targetZoneId: office.zone_id,
          targetGridPos: { x: office.grid_x, y: office.grid_y },
          animationState: 'working',
          publicState: 'working',
          emote: null,
          chatBubble: task.description?.slice(0, 60) ?? null,
          badge: null,
          source: 'durable',
        }
      }
    }
    // Fallback: executing but no Office zone -> Desk + working + chatBubble if available
    return {
      agentId: agent.agent_id,
      ...deskPos,
      animationState: 'working',
      publicState: 'working',
      emote: null,
      chatBubble: task.description?.slice(0, 60) ?? null,
      badge: null,
      source: 'durable',
    }
  }

  // P3: Thinking / queued -> Desk + waiting
  if (agent.status === 'thinking' || agent.status === 'queued') {
    return {
      agentId: agent.agent_id,
      ...deskPos,
      animationState: 'thinking',
      publicState: 'waiting',
      emote: 'thinking',
      chatBubble: null,
      badge: null,
      source: 'durable',
    }
  }

  // P4: Idle -> WANDER (NOT desk)
  return {
    agentId: agent.agent_id,
    targetZoneId: null,
    targetGridPos: { x: 0, y: 0 },
    animationState: 'idle',
    publicState: 'idle',
    emote: null,
    chatBubble: null,
    badge: null,
    source: 'durable',
  }
}

/**
 * resolveAgentState — pure function: business state -> spatial state
 *
 * @deprecated Use resolveDurable() — kept for test migration compatibility
 *
 * Implements the 5-priority chain from arch doc section 5.2.
 * Internally delegates to resolveDurable() via adapter.
 */
export function resolveAgentState(input: ProjectionInput): AgentSpatialState {
  return resolveDurable({
    agent: input.agent,
    homeDesk: input.homeDesk,
    activeTasks: input.activeTasks.map(t => ({ ...t, board_id: null })),
    zoneBindings: input.zoneBindings.map(b => ({
      ...b,
      zone_type: b.zone_type ?? (b.binding_type === 'agent_desk' ? 'desk' as const : 'office' as const),
      room_capability: b.room_capability ?? null,
      label: b.label ?? null,
      color: b.color ?? null,
    })),
  })
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
