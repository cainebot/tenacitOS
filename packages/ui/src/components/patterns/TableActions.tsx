"use client"

import { type ReactNode } from "react"
import { Button, type ButtonVariant, type ButtonSize } from "../base/button"
import { cx } from "../../utils/cx"

export interface TableAction {
  key: string
  label: string
  icon?: ReactNode
  variant?: ButtonVariant
  onPress?: () => void
  isDisabled?: boolean
}

export interface TableActionsProps {
  actions: TableAction[]
  size?: ButtonSize
  className?: string
}

export function TableActions({
  actions,
  size = "sm",
  className,
}: TableActionsProps) {
  return (
    <div className={cx("flex items-center gap-1", className)}>
      {actions.map((action) => (
        <Button
          key={action.key}
          variant={action.variant ?? "ghost"}
          size={size}
          onPress={action.onPress}
          isDisabled={action.isDisabled}
          iconLeading={action.icon}
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}
