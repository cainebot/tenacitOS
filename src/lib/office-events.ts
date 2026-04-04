// Typed event bridge between Phaser (emitter) and React (listener)
// Uses a minimal Map-based EventEmitter — no external deps, no browser EventTarget quirks.

import type { AgentSpatialState } from '@/features/office/types'

export type { AgentSpatialState } from '@/features/office/types'

export interface AgentSelectPayload {
  agent_id: string
  name: string
  role: string
  status: string
}

export type OfficeEventMap = {
  // Existing
  'agent:select': AgentSelectPayload
  'agent:deselect': void

  // Phaser → React (discrete, not per-frame)
  'agent:clicked': { agentId: string; screenX: number; screenY: number }
  'agent:hover': { agentId: string } | null
  'interaction:available': { entityId: string; entityType: 'agent' | 'zone' | 'object' }
  'player:moved': { gridX: number; gridY: number; facing: string }

  // React → Phaser (discrete)
  'camera:focus': { x: number; y: number; zoom?: number }
  'camera:follow': { entityId: string }

  // Phase 83 projection
  'projection:update': { agentId: string; state: AgentSpatialState }
  'zone:clicked': { zoneId: string; zoneType: string }
}

type Listener<T> = (payload: T) => void

class OfficeEventEmitter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners = new Map<string, Set<Listener<any>>>()

  on<K extends keyof OfficeEventMap>(event: K, listener: Listener<OfficeEventMap[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
  }

  off<K extends keyof OfficeEventMap>(event: K, listener: Listener<OfficeEventMap[K]>): void {
    this.listeners.get(event)?.delete(listener)
  }

  emit<K extends keyof OfficeEventMap>(event: K, payload: OfficeEventMap[K]): void {
    this.listeners.get(event)?.forEach(fn => fn(payload))
  }
}

// Singleton — shared between Phaser scene and React page
const officeEvents = new OfficeEventEmitter()

export default officeEvents
