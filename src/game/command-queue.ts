// ── Surface 3: React → Phaser command queue ──
// React enqueues commands. Phaser drains once per frame in update().
// Uses globalThis to survive dynamic import chunk boundaries.

export type GameCommand =
  | { type: 'teleport'; x: number; y: number }
  | { type: 'focusAgent'; agentId: string }
  | { type: 'setZoom'; zoom: number }
  | { type: 'updateAgent'; agentId: string; status: string }

const QUEUE_KEY = '__circos_cmd_queue' as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any
if (!g[QUEUE_KEY]) g[QUEUE_KEY] = [] as GameCommand[]

const queue: GameCommand[] = g[QUEUE_KEY]

export function enqueue(cmd: GameCommand): void {
  queue.push(cmd)
}

export function drain(): GameCommand[] {
  if (queue.length === 0) return queue
  return queue.splice(0)
}
