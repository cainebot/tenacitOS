"use client"

import {
  DialogTrigger,
  Popover as AriaPopover,
  Dialog,
  type PopoverProps as AriaPopoverProps,
} from "react-aria-components"
import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

export interface PopoverProps
  extends Omit<AriaPopoverProps, "className" | "children" | "trigger"> {
  trigger: ReactNode
  children: ReactNode
  className?: string
}

export function Popover({
  trigger,
  children,
  className,
  ...props
}: PopoverProps) {
  return (
    <DialogTrigger>
      {trigger}
      <AriaPopover
        className={cx(
          "rounded-lg border border-secondary bg-secondary shadow-2xl",
          "entering:animate-in entering:fade-in entering:zoom-in-95 entering:duration-200",
          "exiting:animate-out exiting:fade-out exiting:zoom-out-95 exiting:duration-150",
          className
        )}
        {...props}
      >
        <Dialog className="p-3 text-sm text-primary outline-none">
          {children}
        </Dialog>
      </AriaPopover>
    </DialogTrigger>
  )
}
