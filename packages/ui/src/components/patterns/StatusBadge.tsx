"use client"

import { Badge, type BadgeVariant, type BadgeSize } from "../base/badge"
import { cx } from "../../utils/cx"

export type StatusType = "active" | "inactive" | "pending" | "error" | "success" | "warning" | "info"

export interface StatusBadgeProps {
  status: StatusType
  label: string
  size?: BadgeSize
  showDot?: boolean
  className?: string
}

const statusConfig: Record<StatusType, { variant: BadgeVariant; dotColor: string }> = {
  active: { variant: "success", dotColor: "bg-success-500" },
  success: { variant: "success", dotColor: "bg-success-500" },
  inactive: { variant: "gray", dotColor: "bg-gray-400" },
  pending: { variant: "warning", dotColor: "bg-warning-500" },
  warning: { variant: "warning", dotColor: "bg-warning-500" },
  error: { variant: "error", dotColor: "bg-error-500" },
  info: { variant: "info", dotColor: "bg-info-500" },
}

export function StatusBadge({
  status,
  label,
  size = "md",
  showDot = true,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} size={size} className={cx("inline-flex items-center gap-1.5", className)}>
      {showDot && (
        <span
          className={cx("inline-block h-1.5 w-1.5 rounded-full", config.dotColor)}
          aria-hidden
        />
      )}
      {label}
    </Badge>
  )
}
