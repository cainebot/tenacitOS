/** UUID of the single published map (from office_maps seed) */
export const PUBLISHED_MAP_ID = '11111111-1111-1111-1111-111111111111'

/** Alias for contexts where "default" reads better than "published" */
export const DEFAULT_MAP_ID = PUBLISHED_MAP_ID

// ── Room capability registry (Phase 87) ──
// Canonical source for all room_capability values used in zone bindings.
// Validated at runtime via isKnownCapability guard.

/** Room capability registry — canonical source for all room_capability values */
export const ROOM_CAPABILITIES = {
  brainstorm:    { label: 'Brainstorm',    icon: 'Lightbulb' },
  standup:       { label: 'Standup',       icon: 'Users' },
  qa_lab:        { label: 'QA Lab',        icon: 'TestTube' },
  call:          { label: 'Call',          icon: 'Phone' },
  review:        { label: 'Review',        icon: 'Eye' },
  social:        { label: 'Social',        icon: 'Coffee' },
  idle_activity: { label: 'Idle Activity', icon: 'Gamepad' },
} as const

export type RoomCapability = keyof typeof ROOM_CAPABILITIES

export function isKnownCapability(cap: string): cap is RoomCapability {
  return cap in ROOM_CAPABILITIES
}
