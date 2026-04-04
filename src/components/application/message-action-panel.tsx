'use client'

import { cx } from '@circos/ui'
import { Stars02, Edit04, RefreshCcw02, Copy01 } from '@untitledui/icons'
import type { FC, SVGProps } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

export type MessageAction = 'ai' | 'edit' | 'retry' | 'copy'

export interface MessageActionPanelProps {
  /** Actions to display (default: all four) */
  actions?: MessageAction[]
  /** Callback when any action is clicked */
  onAction?: (action: MessageAction) => void
  className?: string
}

// ── Action config ────────────────────────────────────────────────────────────

const actionConfig: Record<MessageAction, { icon: FC<SVGProps<SVGSVGElement>>; label: string }> = {
  ai: { icon: Stars02, label: 'AI assist' },
  edit: { icon: Edit04, label: 'Edit message' },
  retry: { icon: RefreshCcw02, label: 'Retry' },
  copy: { icon: Copy01, label: 'Copy' },
}

const defaultActions: MessageAction[] = ['ai', 'edit', 'retry', 'copy']

// ── Component ────────────────────────────────────────────────────────────────

export function MessageActionPanel({
  actions = defaultActions,
  onAction,
  className,
}: MessageActionPanelProps) {
  return (
    <div
      className={cx(
        'bg-[#13161b] flex items-center gap-1.5 px-2 py-1.5 rounded-lg shadow-xl',
        className
      )}
      role="toolbar"
      aria-label="Message actions"
    >
      {actions.map((action) => {
        const { icon: Icon, label } = actionConfig[action]
        return (
          <button
            key={action}
            type="button"
            className="p-0.5 rounded-sm hover:bg-secondary_hover transition-colors"
            aria-label={label}
            onClick={() => onAction?.(action)}
          >
            <Icon className="size-4 text-fg-white" />
          </button>
        )
      })}
    </div>
  )
}
