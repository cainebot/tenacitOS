'use client'

import { useEffect, useRef } from 'react'
import officeEvents from '@/lib/office-events'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks'
import { useOfficeStore } from '../../stores/office-store'
import { resolveAgentState } from '../../projection/projection-service'
import { IdleScheduler, pickRandomPOI, pickFlavorText } from '../../projection/idle-scheduler'
import { getSnapshot } from '@/game/state-snapshot'
import type { AgentSpatialState } from '../../types'

/**
 * Wires Supabase Realtime (agents + tasks) through ProjectionService
 * to officeEvents 'projection:update'. Must be mounted in the office page.
 *
 * Only emits when Phaser scene lifecycle is 'ready' (prevents race condition
 * where events fire before AgentManager has spawned agents).
 */
export function useProjection(): void {
  const { agents } = useRealtimeAgents()
  const { tasks } = useRealtimeTasks()
  const zoneBindings = useOfficeStore((s) => s.zoneBindings)
  const pois = useOfficeStore((s) => s.pois)
  const idleSchedulerRef = useRef<IdleScheduler | null>(null)

  // Lazy-init idle scheduler
  if (!idleSchedulerRef.current) {
    idleSchedulerRef.current = new IdleScheduler()
  }

  useEffect(() => {
    // Don't emit until Phaser scene is ready
    const snap = getSnapshot()
    if (snap.lifecycle !== 'ready') return

    const scheduler = idleSchedulerRef.current!

    for (const agent of agents) {
      // Find home desk binding
      const homeDesk = zoneBindings.find(
        (b) => b.agent_id === agent.agent_id && b.binding_type === 'agent_desk'
      )
      if (!homeDesk) continue  // skip agent without desk binding

      // Filter active tasks for this agent
      const activeTasks = tasks.filter((t) => t.target_agent_id === agent.agent_id)

      // Resolve spatial state
      const state: AgentSpatialState = resolveAgentState({
        agent,
        homeDesk,
        activeTasks,
        zoneBindings,
        mapZones: [],  // MVP: no map zones parsed
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
          // Pick random POI and emit wander
          const poi = pickRandomPOI()
          const wanderState: AgentSpatialState = {
            agentId: agent.agent_id,
            targetZoneId: poi.id,
            targetGridPos: { x: poi.gridX, y: poi.gridY },
            animationState: 'emote',
            emote: null,
            chatBubble: pickFlavorText(poi),
          }
          officeEvents.emit('projection:update', {
            agentId: agent.agent_id,
            state: wanderState,
          })

          // After POI visit (10-20s), return to desk
          const returnDelay = 10_000 + Math.random() * 10_000
          setTimeout(() => {
            const deskState: AgentSpatialState = {
              agentId: agent.agent_id,
              targetZoneId: homeDesk.zone_id,
              targetGridPos: { x: homeDesk.grid_x, y: homeDesk.grid_y },
              animationState: 'idle',
              emote: null,
              chatBubble: null,
            }
            officeEvents.emit('projection:update', {
              agentId: agent.agent_id,
              state: deskState,
            })
          }, returnDelay)
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
  }, [agents, tasks, zoneBindings, pois])
}
