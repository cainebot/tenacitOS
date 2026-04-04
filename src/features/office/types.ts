// ── Office domain types for Phase 83: Projection + Agent Intelligence ──
// This is the canonical source of truth for all office-layer TypeScript types.
// Plan 04 will update office-events.ts to import AgentSpatialState from here.

import type { AgentRow, TaskRow } from '@/types/supabase'

// ── Animation states ──

export type AgentAnimationState = 'idle' | 'walking' | 'working' | 'thinking' | 'error' | 'emote'

// ── Agent state machine states ──

export type AgentState = 'AT_DESK' | 'WANDERING' | 'WALKING' | 'AT_POI' | 'WORKING'

// ── Spatial state (canonical definition — office-events.ts partial will be replaced in Plan 04) ──

export interface AgentSpatialState {
  agentId: string
  targetZoneId: string | null
  targetGridPos: { x: number; y: number }
  animationState: AgentAnimationState
  emote: string | null
  chatBubble: string | null
}

// ── Zone binding — maps zones to agents, projects, or boards ──

export interface ZoneBinding {
  binding_id: string
  zone_id: string
  binding_type: 'agent_desk' | 'project_board' | 'meeting_room' | 'break_room' | 'department' | 'custom'
  agent_id: string | null
  project_id: string | null
  board_id: string | null
  grid_x: number
  grid_y: number
}

// ── Zone — named area on the map ──

export interface Zone {
  id: string
  type: string
  label: string
  gridCells: Array<{ x: number; y: number }>
  color: string
}

// ── POI — point of interest for idle wandering ──

export interface POI {
  id: string
  type: 'water_cooler' | 'bookshelf' | 'printer' | 'coffee' | 'whiteboard' | 'plant'
  gridX: number
  gridY: number
  flavorTexts: string[]
}

// ── OfficeMapDocument — loaded from office_maps table (or hardcoded for MVP) ──
// Mirrors arch doc section 4.3

export interface OfficeMapDocument {
  version: '1.0'
  canvas: {
    gridWidth: number
    gridHeight: number
    tileSize: number
  }
  tiledMapUrl: string
  zones: Zone[]
  objects: Array<{
    id: string
    spriteKey: string
    gridX: number
    gridY: number
    gridWidth: number
    gridHeight: number
    rotation: number
    layer: number
    blocksNavigation: boolean
    isInteractive: boolean
    interactionConfig?: {
      type: string
      data: Record<string, unknown>
    }
  }>
  spawnPoints: Array<{
    id: string
    gridX: number
    gridY: number
    facing: 'up' | 'down' | 'left' | 'right'
    forType: 'player' | 'agent'
  }>
  pois: POI[]
  navGrid: {
    cellSize: number
    blocked: Array<{ x: number; y: number }>
  }
}

// ── ProjectionInput — input to the ProjectionService pure function ──
// Arch doc section 5.2

export interface ProjectionInput {
  agent: AgentRow
  homeDesk: ZoneBinding
  activeTasks: TaskRow[]
  zoneBindings: ZoneBinding[]
  mapZones: Zone[]
}
