import { isKnownCapability } from '../constants'
import type { RuntimeActivitySignal, NormalizedActivity } from '../types'

/**
 * RuntimeActivityAdapter — normalizes raw agent runtime signals.
 *
 * ADR-007: Signals are advisory, not authoritative.
 * Deduplicates by event_id. Unknown room_capability degrades to idle context.
 */
export class RuntimeActivityAdapter {
  private seen = new Set<string>()

  normalize(signal: RuntimeActivitySignal): NormalizedActivity | null {
    // Dedup by event_id — idempotent processing guarantee
    if (this.seen.has(signal.event_id)) return null
    this.seen.add(signal.event_id)

    // Unknown room_capability → warn + treat as idle context
    if (signal.context_type === 'room_activity' && signal.room_capability) {
      if (!isKnownCapability(signal.room_capability)) {
        console.warn(`[RuntimeActivityAdapter] Unknown capability: ${signal.room_capability}`)
        return {
          agent_id: signal.agent_id,
          context_type: 'idle',
          board_id: null,
          room_capability: null,
          reason: null,
          is_ephemeral: false,
          received_at: Date.now(),
        }
      }
    }

    return {
      agent_id: signal.agent_id,
      context_type: signal.context_type,
      board_id: signal.board_id ?? null,
      room_capability: signal.room_capability ?? null,
      reason: signal.reason ?? null,
      is_ephemeral: signal.context_type === 'meeting' || signal.context_type === 'room_activity',
      received_at: Date.now(),
    }
  }
}
