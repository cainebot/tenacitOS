"use client"

import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

export interface DetailPanelProps {
  list: ReactNode
  detail: ReactNode
  listWidth?: string
  emptyDetail?: ReactNode
  className?: string
}

export function DetailPanel({
  list,
  detail,
  listWidth = "w-80",
  emptyDetail,
  className,
}: DetailPanelProps) {
  return (
    <div className={cx("flex h-full gap-0 overflow-hidden rounded-xl border border-primary/10", className)}>
      <div
        className={cx(
          "flex-shrink-0 overflow-y-auto border-r border-primary/10 bg-primary/[0.02]",
          listWidth
        )}
      >
        {list}
      </div>
      <div className="flex-1 overflow-y-auto">
        {detail ?? emptyDetail ?? (
          <div className="flex h-full items-center justify-center text-sm text-tertiary">
            Select an item to view details
          </div>
        )}
      </div>
    </div>
  )
}

export interface DetailPanelItemProps {
  title: string
  subtitle?: string
  isSelected?: boolean
  trailing?: ReactNode
  onPress?: () => void
  className?: string
}

export function DetailPanelItem({
  title,
  subtitle,
  isSelected = false,
  trailing,
  onPress,
  className,
}: DetailPanelItemProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cx(
        "flex w-full items-center gap-3 border-b border-primary/10 px-4 py-3 text-left transition-colors",
        isSelected
          ? "bg-brand-600/10 text-primary"
          : "text-secondary hover:bg-primary/[0.04]",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {subtitle && (
          <div className="truncate text-xs text-tertiary">{subtitle}</div>
        )}
      </div>
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
    </button>
  )
}
