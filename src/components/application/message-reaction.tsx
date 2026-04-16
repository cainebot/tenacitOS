'use client'

import { cx } from '@circos/ui'
import { Button as AriaButton } from 'react-aria-components'
import type { ReactNode } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

interface MessageReactionProps {
  /** Emoji element to display */
  emoji: ReactNode
  /** Reaction count — when provided, shows the number next to the emoji */
  count?: number
  /** Whether this reaction is selected/active by the current user */
  isSelected?: boolean
  /** Callback when the reaction is toggled */
  onPress?: () => void
  className?: string
}

// ── MessageReaction ──────────────────────────────────────────────────────────

export function MessageReaction({
  emoji,
  count,
  isSelected = false,
  onPress,
  className,
}: MessageReactionProps) {
  return (
    <AriaButton
      onPress={onPress}
      className={cx(
        'flex items-center justify-center h-6 rounded-full border border-solid px-2 py-1 transition duration-100 ease-linear',
        count != null ? 'gap-1' : 'gap-0',
        isSelected
          ? 'bg-brand-secondary_hover border-brand'
          : 'bg-secondary border-secondary hover:bg-secondary_hover',
        className,
      )}
    >
      <span className="shrink-0 size-4 flex items-center justify-center">{emoji}</span>
      {count != null && (
        <span
          className={cx(
            'text-sm font-medium leading-5 text-center whitespace-nowrap',
            isSelected ? 'text-brand-secondary' : 'text-secondary',
          )}
        >
          {count}
        </span>
      )}
    </AriaButton>
  )
}
