"use client"

import { type ReactNode } from "react"
import { Badge, type BadgeColor } from "../base/badge"
import { cx } from "../../utils/cx"

export type TrendDirection = "up" | "down" | "neutral"

export interface MetricCardProps {
  label: string
  value: string | number
  trend?: {
    value: string
    direction: TrendDirection
  }
  icon?: ReactNode
  badge?: {
    label: string
    color?: BadgeColor
  }
  className?: string
}

const trendStyles: Record<TrendDirection, string> = {
  up: "text-success-500",
  down: "text-error-500",
  neutral: "text-tertiary",
}

const trendIcons: Record<TrendDirection, string> = {
  up: "\u2191",
  down: "\u2193",
  neutral: "\u2192",
}

export function MetricCard({
  label,
  value,
  trend,
  icon,
  badge,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cx(
        "rounded-xl border border-primary/10 bg-primary/[0.02] p-5",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.06] text-secondary">
              {icon}
            </div>
          )}
          <span className="text-sm text-secondary">{label}</span>
        </div>
        {badge && (
          <Badge color={badge.color ?? "gray"} size="sm">
            {badge.label}
          </Badge>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-2xl font-semibold text-primary">{value}</span>
        {trend && (
          <span className={cx("mb-0.5 text-sm font-medium", trendStyles[trend.direction])}>
            {trendIcons[trend.direction]} {trend.value}
          </span>
        )}
      </div>
    </div>
  )
}
