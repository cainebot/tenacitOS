"use client"

import { type ReactNode } from "react"
import { Button, type ButtonCommonProps } from "../base/button"
import { cx } from "../../utils/cx"

export interface TableAction {
  key: string
  label: string
  icon?: ReactNode
  color?: ButtonCommonProps["color"]
  onClick?: () => void
  isDisabled?: boolean
}

export interface TableActionsProps {
  actions: TableAction[]
  size?: ButtonCommonProps["size"]
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
          color={action.color ?? "tertiary"}
          size={size}
          onClick={action.onClick}
          isDisabled={action.isDisabled}
          iconLeading={action.icon}
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}
