"use client"

import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

export interface TimelineItemProps {
  icon?: ReactNode
  title: string
  description?: string
  timestamp?: string
  trailing?: ReactNode
  isLast?: boolean
  className?: string
}

export function TimelineItem({
  icon,
  title,
  description,
  timestamp,
  trailing,
  isLast = false,
  className,
}: TimelineItemProps) {
  return (
    <div className={cx("relative flex gap-3", className)}>
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-primary/10 bg-primary/[0.04] text-secondary">
          {icon ?? (
            <span className="h-2 w-2 rounded-full bg-primary/30" />
          )}
        </div>
        {!isLast && (
          <div className="mt-1 w-px flex-1 bg-primary/10" />
        )}
      </div>

      {/* Content */}
      <div className={cx("flex-1 pb-6", isLast && "pb-0")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-primary">{title}</p>
            {description && (
              <p className="mt-0.5 text-sm text-tertiary">{description}</p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {timestamp && (
              <span className="text-xs text-tertiary">{timestamp}</span>
            )}
            {trailing}
          </div>
        </div>
      </div>
    </div>
  )
}

export interface TimelineProps {
  children: ReactNode
  className?: string
}

export function Timeline({ children, className }: TimelineProps) {
  return <div className={cx("flex flex-col", className)}>{children}</div>
}
