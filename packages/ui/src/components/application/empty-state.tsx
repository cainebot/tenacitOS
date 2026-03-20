"use client"

import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-white/20 [&_svg]:h-12 [&_svg]:w-12">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-white/50">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
