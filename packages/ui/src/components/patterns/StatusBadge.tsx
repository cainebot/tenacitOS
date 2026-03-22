"use client"

import { Badge, type BadgeColor, type BadgeSize } from "../base/badge"
import { cx } from "../../utils/cx"

export type StatusType = "active" | "inactive" | "pending" | "error" | "success" | "warning" | "info"

export interface StatusBadgeProps {
  status: StatusType
  label: string
  size?: BadgeSize
  showDot?: boolean
  className?: string
}

const statusConfig: Record<StatusType, { color: BadgeColor; dotColor: string }> = {
  active: { color: "success", dotColor: "bg-success-500" },
  success: { color: "success", dotColor: "bg-success-500" },
  inactive: { color: "gray", dotColor: "bg-gray-400" },
  pending: { color: "warning", dotColor: "bg-warning-500" },
  warning: { color: "warning", dotColor: "bg-warning-500" },
  error: { color: "error", dotColor: "bg-error-500" },
  info: { color: "blue", dotColor: "bg-blue-500" },
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
    <Badge color={config.color} size={size} className={cx("inline-flex items-center gap-1.5", className)}>
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
