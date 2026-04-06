'use client'

import { useEffect, useRef, useState } from 'react'
import officeEvents from '@/lib/office-events'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import { useEnrichedTasks } from './use-enriched-tasks'
import { useOfficeStore } from '../../stores/office-store'
import { resolveDurable } from '../../projection/projection-service'
import { IdleScheduler, pickRandomPOI, pickFlavorText } from '../../projection/idle-scheduler'
import { subscribe, getSnapshot } from '@/game/state-snapshot'
import type { AgentSpatialState, Zone } from '../../types'

/**
 * Resolve the target grid position for a zone:
 * 1. Primary: first seat tile in the zone (the armchair placed via builder)
 * 2. Fallback: first non-blocked gridCell in the zone
 * 3. Last resort: {x:0, y:0} (should never happen for valid zones)
 */
function resolveZoneGridPos(
  zoneId: string | null,
  mapZones: Zone[],
  blockedSet?: Set<string>,
): { x: number; y: number } | null {
  if (!zoneId) return null
  const zone = mapZones.find((z) => z.id === zoneId)
  if (!zone) return null

  // Primary: seat tile
  if (zone.seats?.length) {
    return { x: zone.seats[0].gridX, y: zone.seats[0].gridY }
  }

  // Fallback: first non-blocked gridCell
  if (zone.gridCells?.length) {
    if (blockedSet) {
      const open = zone.gridCells.find((c) => !blockedSet.has(`${c.x},${c.y}`))
      if (open) return open
    }
    return zone.gridCells[0]
  }

  return null
}

/**
 * Wires Supabase Realtime (agents + tasks) through ProjectionService
 * to officeEvents 'projection:update'. Must be mounted in the office page.
 *
 * Uses resolveDurable() for board_id-aware projection (Phase 87 v2 pipeline).
 * Idle agents wander continuously — no return-to-desk pattern.
 *
 * Only emits when Phaser scene lifecycle is 'ready' (prevents race condition
 * where events fire before AgentManager has spawned agents).
 */
export function useProjection(): void {
  const { agents } = useRealtimeAgents()
  const { enrichedTasks } = useEnrichedTasks()
  const zoneBindings = useOfficeStore((s) => s.zoneBindings)
  const mapZones = useOfficeStore((s) => s.mapDocument?.zones ?? [])
  const pois = useOfficeStore((s) => s.pois)

  // Track Phaser lifecycle so projection re-fires when scene becomes 'ready'
  // after React has already mounted (common: Supabase responds before Phaser loads assets)
  const [lifecycle, setLifecycle] = useState(getSnapshot().lifecycle)
  useEffect(() => {
    return subscribe(() => {
      const snap = getSnapshot()
      if (snap.lifecycle !== lifecycle) setLifecycle(snap.lifecycle)
    })
  }, [lifecycle])

  const idleSchedulerRef = useRef<IdleScheduler | null>(null)

  // Lazy-init idle scheduler
  if (!idleSchedulerRef.current) {
    idleSchedulerRef.current = new IdleScheduler()
  }

  useEffect(() => {
    // Don't emit until Phaser scene is ready
    if (lifecycle !== 'ready') return

    // Don't emit until zone bindings are loaded from Supabase
    // Prevents race condition where projection fires before DB data arrives
    if (zoneBindings.length === 0) return

    const scheduler = idleSchedulerRef.current!

    for (const agent of agents) {
      // Find home desk binding — backward-compatible: zone_type (v2) or binding_type (v1 pre-migration)
      const homeDesk = zoneBindings.find(
        (b) => b.agent_id === agent.agent_id && (b.zone_type === 'desk' || b.binding_type === 'agent_desk')
      ) ?? null  // resolveDurable handles null homeDesk with {x:0,y:0} fallback

      // Filter active enriched tasks for this agent
      const activeTasks = enrichedTasks.filter((t) => t.target_agent_id === agent.agent_id)

      // Resolve spatial state via v2 durable projection pipeline
      const state = resolveDurable({
        agent,
        homeDesk,
        activeTasks,
        zoneBindings,
      })

      // Resolve actual grid position from zone seat/gridCells (overrides binding grid_x/y)
      if (state.targetZoneId) {
        const resolved = resolveZoneGridPos(state.targetZoneId, mapZones)
        if (resolved) {
          state.targetGridPos = resolved
        }
      }

      // ── Agents without a resolved position: treat as wandering (never emit 0,0) ──
      // This catches: idle agents (P4) AND desk-bound agents without homeDesk (P1/P2/P3 fallback)
      const needsWander = state.animationState === 'idle'
        || (state.targetZoneId === null && state.targetGridPos.x === 0 && state.targetGridPos.y === 0)

      if (needsWander) {
        if (pois.length > 0) {
          // Emit immediate POI — agent walks to a random spot right away
          const poi = pickRandomPOI(pois)
          officeEvents.emit('projection:update', {
            agentId: agent.agent_id,
            state: {
              ...state,
              targetZoneId: poi.id,
              targetGridPos: { x: poi.gridX, y: poi.gridY },
              animationState: 'emote',
              chatBubble: pickFlavorText(poi),
            },
          })
        }
        // Schedule next patrol stop (30-120s pause → walk to another POI)
        scheduler.scheduleWander(agent.agent_id, () => {
          if (pois.length === 0) return
          const poi = pickRandomPOI(pois)
          officeEvents.emit('projection:update', {
            agentId: agent.agent_id,
            state: {
              agentId: agent.agent_id,
              targetZoneId: poi.id,
              targetGridPos: { x: poi.gridX, y: poi.gridY },
              animationState: 'emote',
              emote: null,
              chatBubble: pickFlavorText(poi),
              publicState: 'idle',
              badge: null,
              source: 'durable',
            },
          })
        })
      } else {
        // ── Non-idle: emit resolved state, cancel pending wander ──
        scheduler.cancelWander(agent.agent_id)
        officeEvents.emit('projection:update', {
          agentId: agent.agent_id,
          state,
        })
      }
    }

    // Cleanup: cancel all idle timers on unmount or deps change
    return () => {
      scheduler.cancelAll()
    }
  }, [agents, enrichedTasks, zoneBindings, mapZones, pois, lifecycle])
}
