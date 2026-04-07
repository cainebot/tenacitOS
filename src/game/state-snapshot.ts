// ── Surface 1: Mutable game state snapshot ──
// Phaser writes every frame in update(). React reads at its own cadence.
// useSyncExternalStore-compatible via subscribe/getSnapshot.
//
// Uses globalThis to guarantee a single instance across dynamic import
// chunk boundaries (PhaserBridge is loaded via next/dynamic, which creates
// a separate chunk — without globalThis, the bundler may instantiate this
// module twice and Phaser writes to one copy while React reads another).

export type Lifecycle = 'booting' | 'loading' | 'ready' | 'error' | 'destroyed'

export interface AgentSnapshot {
  id: string
  x: number
  y: number
  name: string
  role: string
  status: string
}

export interface GameSnapshot {
  lifecycle: Lifecycle
  frame: number
  updatedAt: number
  lastError: string | null

  world: { width: number; height: number }

  player: {
    x: number
    y: number
    facing: string
    moving: boolean
    zoneId: string | null
  }

  agents: ReadonlyArray<AgentSnapshot>

  camera: {
    x: number
    y: number
    w: number
    h: number
    zoom: number
  }

  nearbyAgentId: string | null
  minimapBg: ImageBitmap | null
}

// ── Singleton via globalThis (survives chunk duplication) ──

const SNAP_KEY = '__circos_snapshot' as const
const LISTENERS_KEY = '__circos_snapshot_listeners' as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any

if (!g[SNAP_KEY]) {
  g[SNAP_KEY] = {
    lifecycle: 'booting',
    frame: 0,
    updatedAt: 0,
    lastError: null,
    world: { width: 0, height: 0 },
    player: { x: 0, y: 0, facing: 'down', moving: false, zoneId: null },
    agents: [],
    camera: { x: 0, y: 0, w: 0, h: 0, zoom: 1 },
    nearbyAgentId: null,
    minimapBg: null,
  } satisfies GameSnapshot
}

if (!g[LISTENERS_KEY]) {
  g[LISTENERS_KEY] = new Set<() => void>()
}

export const snapshot: GameSnapshot = g[SNAP_KEY]
const listeners: Set<() => void> = g[LISTENERS_KEY]

export function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getSnapshot(): GameSnapshot {
  return snapshot
}

export function notifySubscribers(): void {
  for (const fn of listeners) fn()
}
