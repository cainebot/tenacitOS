// ── Asset & gameplay constants for the CircOS Virtual Office ──
// Extracted from office-map.tsx monolith. NO Phaser imports needed.

export interface AgentData {
  agent_id: string
  name: string
  role?: string
  status: string
}

export interface SpawnPosition {
  tileX: number
  tileY: number
  facing: string
}

// ── Tileset ──
export const TILESET = {
  mapName: 'map_centered_tileset_64x64',
  key: 'ts_office_v3',
  path: '/assets/tilesets/office-v3-tileset.png',
} as const

// ── Character sprites ──
export const PLAYER_SPRITE = { key: 'player', path: '/assets/characters/Premade_Character_48x48_01.png' } as const

export const CHAR_SPRITES = [
  { key: 'char_1', path: '/assets/characters/Premade_Character_48x48_02.png' },
  { key: 'char_2', path: '/assets/characters/Premade_Character_48x48_03.png' },
  { key: 'char_3', path: '/assets/characters/Premade_Character_48x48_04.png' },
  { key: 'char_4', path: '/assets/characters/Premade_Character_48x48_05.png' },
  { key: 'char_5', path: '/assets/characters/Premade_Character_48x48_06.png' },
  { key: 'char_6', path: '/assets/characters/Premade_Character_48x48_09.png' },
] as const

// ── Demo agents (fallback when API unavailable) ──
export const DEMO_AGENTS: AgentData[] = [
  { agent_id: 'pomni', name: 'Pomni', role: 'Scrum Master', status: 'active' },
  { agent_id: 'kinger', name: 'Kinger', role: 'Prospector', status: 'working' },
  { agent_id: 'ragatha', name: 'Ragatha', role: 'Copywriter', status: 'active' },
  { agent_id: 'jax', name: 'Jax', role: 'Qualifier', status: 'idle' },
  { agent_id: 'gangle', name: 'Gangle', role: 'Enricher', status: 'working' },
  { agent_id: 'kaufmo', name: 'Kaufmo', role: 'Developer', status: 'active' },
  { agent_id: 'zooble', name: 'Zooble', role: 'Analyst', status: 'idle' },
]

// ── Spawn positions (inside main office building) ──
export const SPAWN_POSITIONS: SpawnPosition[] = [
  { tileX: 48, tileY: 42, facing: 'down' },
  { tileX: 58, tileY: 38, facing: 'right' },
  { tileX: 68, tileY: 42, facing: 'left' },
  { tileX: 42, tileY: 55, facing: 'down' },
  { tileX: 90, tileY: 38, facing: 'down' },
  { tileX: 55, tileY: 60, facing: 'right' },
  { tileX: 82, tileY: 55, facing: 'left' },
]

export const PLAYER_SPAWN = { tileX: 63, tileY: 48, facing: 'down' } as const

// ── Status colors ──
export const STATUS_COLOR: Record<string, number> = {
  active: 0x12b76a,
  idle: 0x667085,
  working: 0xf79009,
  busy: 0xf79009,
  error: 0xf04438,
  offline: 0xf04438,
}

// ── LimeZu spritesheet format (48x96 frames, 56 cols per row) ──
export const COLS = 56
export const FRAMES_PER_DIR = 6
export const DIR_INDEX: Record<string, number> = { right: 0, up: 1, left: 2, down: 3 }
export const IDLE_ROW = 1
export const WALK_ROW = 2
export const SPRITE_SCALE = 2.0

// ── Gameplay ──
export const PLAYER_SPEED = 540 // pixels per second
export const INTERACTION_RANGE = 120 // pixels — distance to show "Press E"
export const DESELECT_RANGE = 200   // pixels — distance to auto-close agent panel
