'use client'

import { cx } from '@circos/ui'
import { Button as AriaButton } from 'react-aria-components'
import { RefreshCcw02, Copy01, CornerUpLeft } from '@untitledui/icons'
import type { FC, SVGProps } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

export type MessageAction = 'copy' | 'retry' | 'reply'

export interface MessageActionPanelProps {
  /** Actions to display (default: all three) */
  actions?: MessageAction[]
  /** Callback when any action is clicked */
  onAction?: (action: MessageAction) => void
  className?: string
}

// ── Action config ────────────────────────────────────────────────────────────

const actionConfig: Record<MessageAction, { icon: FC<SVGProps<SVGSVGElement>>; label: string }> = {
  copy: { icon: Copy01, label: 'Copy' },
  retry: { icon: RefreshCcw02, label: 'Retry' },
  reply: { icon: CornerUpLeft, label: 'Reply' },
}

const defaultActions: MessageAction[] = ['copy', 'retry', 'reply']

// ── Component ────────────────────────────────────────────────────────────────

export function MessageActionPanel({
  actions = defaultActions,
  onAction,
  className,
}: MessageActionPanelProps) {
  return (
    <div
      className={cx(
        'bg-primary flex items-center gap-1.5 px-2 py-1.5 rounded-lg shadow-xl',
        className
      )}
      role="toolbar"
      aria-label="Message actions"
    >
      {actions.map((action) => {
        const { icon: Icon, label } = actionConfig[action]
        return (
          <AriaButton
            key={action}
            className="p-0.5 rounded-sm hover:bg-secondary_hover transition-colors"
            aria-label={label}
            onPress={() => onAction?.(action)}
          >
            <Icon className="size-4 text-fg-white" />
          </AriaButton>
        )
      })}
    </div>
  )
}
