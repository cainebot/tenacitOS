"use client"

import { type ReactNode } from "react"
import { Button } from "../base/button"
import { EmptyState } from "../application/empty-state"
import { cx } from "../../utils/cx"

export interface OCEmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  actionIcon?: ReactNode
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  className?: string
}

export function OCEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: OCEmptyStateProps) {
  const action =
    actionLabel || secondaryActionLabel ? (
      <div className="flex items-center gap-3">
        {secondaryActionLabel && (
          <Button variant="outline" size="sm" onPress={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
        {actionLabel && (
          <Button
            variant="primary"
            size="sm"
            onPress={onAction}
            iconLeading={actionIcon}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    ) : undefined

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={cx("py-16", className)}
    />
  )
}
