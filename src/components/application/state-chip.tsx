'use client'

import { BadgeWithButton, BadgeWithDot } from '@circos/ui'
import type { ProjectStateRow } from '@/types/project'
import { COLOR_PALETTE } from './color-swatch-picker'

/**
 * Maps a hex color to a UUI BadgeColor name.
 * Exported for reuse in DragOverlay and Phase 86 column cards.
 */
export function hexToBadgeColor(hex: string): string {
  const match = COLOR_PALETTE.find((c) => c.hex === hex)
  return match?.badgeColor ?? 'gray'
}

interface StateChipProps {
  state: ProjectStateRow
  /** Optional — when provided, renders BadgeWithButton (X to unassign).
   *  When omitted, renders BadgeWithDot (DragOverlay context, no action). */
  onRemove?: (stateId: string) => void
}

/**
 * Reusable state chip used in:
 * - DragOverlay (no onRemove → BadgeWithDot)
 * - Phase 86 column cards (with onRemove → BadgeWithButton)
 */
export function StateChip({ state, onRemove }: StateChipProps) {
  const badgeColor = hexToBadgeColor(state.color)

  if (!onRemove) {
    // DragOverlay context — no X button (per D-14)
    return (
      <BadgeWithDot
        color={badgeColor as Parameters<typeof BadgeWithDot>[0]['color']}
        type="pill-color"
      >
        {state.name}
      </BadgeWithDot>
    )
  }

  return (
    <BadgeWithButton
      color={badgeColor as Parameters<typeof BadgeWithButton>[0]['color']}
      type="pill-color"
      onButtonClick={() => onRemove(state.state_id)}
      buttonLabel={`Remove ${state.name}`}
    >
      {state.name}
    </BadgeWithButton>
  )
}
