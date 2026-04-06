'use client'

import { useEffect, useRef, useState } from 'react'
import officeEvents from '@/lib/office-events'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import { useEnrichedTasks } from './use-enriched-tasks'
import { useOfficeStore } from '../../stores/office-store'
import { resolveDurable } from '../../projection/projection-service'
import { IdleScheduler, pickRandomPOI, pickFlavorText } from '../../projection/idle-scheduler'
import { subscribe, getSnapshot } from '@/game/state-snapshot'
import type { AgentSpatialState } from '../../types'

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
      // Find home desk binding using v2 canonical lookup (zone_type === 'desk')
      const homeDesk = zoneBindings.find(
        (b) => b.agent_id === agent.agent_id && b.zone_type === 'desk'
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

      // Emit projection event to Phaser
      officeEvents.emit('projection:update', {
        agentId: agent.agent_id,
        state,
      })

      // Manage idle wandering
      if (state.animationState === 'idle') {
        // Schedule wandering if not already scheduled
        scheduler.scheduleWander(agent.agent_id, () => {
          // Guard: skip wander if no POIs available
          if (pois.length === 0) return
          // Pick random POI and emit wander
          const poi = pickRandomPOI(pois)
          const wanderState: AgentSpatialState = {
            agentId: agent.agent_id,
            targetZoneId: poi.id,
            targetGridPos: { x: poi.gridX, y: poi.gridY },
            animationState: 'emote',
            emote: null,
            chatBubble: pickFlavorText(poi),
            publicState: 'idle',      // wandering is still idle public state
            badge: null,
            source: 'durable',
          }
          officeEvents.emit('projection:update', {
            agentId: agent.agent_id,
            state: wanderState,
          })
          // No return-to-desk setTimeout — idle scheduler re-triggers next wander on cycle
        })
      } else {
        // Non-idle state: cancel any pending wander
        scheduler.cancelWander(agent.agent_id)
      }
    }

    // Cleanup: cancel all idle timers on unmount or deps change
    return () => {
      scheduler.cancelAll()
    }
  }, [agents, enrichedTasks, zoneBindings, pois, lifecycle])
}
