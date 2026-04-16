// ── Office domain types for Phase 83: Projection + Agent Intelligence ──
// This is the canonical source of truth for all office-layer TypeScript types.
// Plan 04 will update office-events.ts to import AgentSpatialState from here.

import type { AgentRow, TaskRow } from '@/types/supabase'

// ── Animation states ──

export type AgentAnimationState = 'idle' | 'walking' | 'working' | 'thinking' | 'error' | 'emote'

// ── Agent state machine states ──

export type AgentState = 'AT_DESK' | 'WANDERING' | 'WALKING' | 'AT_POI' | 'WORKING'

// ── Agent public display states (Phase 87) — 8 states visible in UI ──

export type AgentDisplayState = 'idle' | 'working' | 'focused' | 'waiting' | 'blocked' | 'overloaded' | 'meeting' | 'error'

// ── Spatial state (canonical definition — office-events.ts partial will be replaced in Plan 04) ──

export interface AgentSpatialState {
  agentId: string
  targetZoneId: string | null
  targetGridPos: { x: number; y: number }
  animationState: AgentAnimationState
  emote: string | null
  chatBubble: string | null
  // v2 additions (Phase 87)
  publicState: AgentDisplayState
  badge: string | null
  source: 'durable' | 'ephemeral'
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
  label: string | null
  color: string | null
  // v2 additions (Phase 87)
  zone_type: 'desk' | 'office' | 'room'
  room_capability: string | null
}

// ── Zone — named area on the map ──

export interface Zone {
  id: string
  type: string
  label: string
  gridCells: Array<{ x: number; y: number }>
  color: string
  displayOrder?: number      // Determines tile number + card order in builder
  agentRestricted?: boolean  // When true, agents cannot enter this zone
  seats?: Array<{            // Seat positions within this zone
    id: string
    gridX: number
    gridY: number
  }>
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

// ── EnrichedTask — TaskRow with board_id resolved from cards JOIN (Phase 87) ──

export interface EnrichedTask extends TaskRow {
  board_id: string | null  // resolved: task.card_id -> cards.board_id
}

// ── DurableInput — input to the v2 ProjectionService pure function (Phase 87) ──

export interface DurableInput {
  agent: AgentRow
  homeDesk: ZoneBinding | null  // null = agent has no desk binding
  activeTasks: EnrichedTask[]
  zoneBindings: ZoneBinding[]
}

// ── EphemeralOverride — TTL-scoped override from meetings/room activities (Phase 87) ──

export interface EphemeralOverride {
  context_type: 'meeting' | 'room_activity'
  targetZoneId: string
  publicState: AgentDisplayState
  ttl_seconds: number
  exit_condition?: string
  started_at: number  // Date.now() at activation
}

// ── RuntimeActivitySignal — advisory signal from agent runtime (Phase 87, ADR-007) ──

export interface RuntimeActivitySignal {
  agent_id: string
  context_type: 'idle' | 'direct_task' | 'board_task' | 'room_activity' | 'meeting' | 'error'
  task_id?: string
  board_id?: string
  room_capability?: string
  reason?: string
  event_id: string       // UUID - dedup key
  emitted_at: string     // ISO timestamp from agent runtime clock
}

// ── NormalizedActivity — processed RuntimeActivitySignal (Phase 87) ──

export interface NormalizedActivity {
  agent_id: string
  context_type: RuntimeActivitySignal['context_type']
  board_id: string | null
  room_capability: string | null
  reason: string | null
  is_ephemeral: boolean   // true for meeting/room_activity
  received_at: number     // Date.now() when processed
}

// ── ProjectionInput — input to the ProjectionService pure function ──
// Arch doc section 5.2
// @deprecated Use DurableInput instead (Phase 87). Will be removed in Plan 03.

export interface ProjectionInput {
  agent: AgentRow
  homeDesk: ZoneBinding
  activeTasks: TaskRow[]
  zoneBindings: ZoneBinding[]
  mapZones: Zone[]
}
