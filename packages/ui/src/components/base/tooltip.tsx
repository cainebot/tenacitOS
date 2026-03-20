"use client"

import {
  Tooltip as AriaTooltip,
  TooltipTrigger as AriaTooltipTrigger,
  OverlayArrow as AriaOverlayArrow,
  type TooltipProps as AriaTooltipProps,
  type TooltipTriggerComponentProps,
} from "react-aria-components"
import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

export interface TooltipProps extends Omit<AriaTooltipProps, "className" | "children"> {
  children: ReactNode
  className?: string
}

export interface TooltipTriggerProps extends TooltipTriggerComponentProps {
  children: ReactNode
}

export function TooltipTrigger({ children, ...props }: TooltipTriggerProps) {
  return <AriaTooltipTrigger {...props}>{children}</AriaTooltipTrigger>
}

export function Tooltip({ children, className, ...props }: TooltipProps) {
  return (
    <AriaTooltip
      offset={8}
      className={cx(
        "rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm text-white shadow-xl",
        "entering:animate-in entering:fade-in entering:zoom-in-95",
        "exiting:animate-out exiting:fade-out exiting:zoom-out-95",
        "placement-top:slide-in-from-bottom-1",
        "placement-bottom:slide-in-from-top-1",
        "placement-left:slide-in-from-right-1",
        "placement-right:slide-in-from-left-1",
        className
      )}
      {...props}
    >
      <AriaOverlayArrow>
        {({ placement }) => (
          <svg
            width={12}
            height={6}
            viewBox="0 0 12 6"
            className={cx(
              "fill-neutral-900 stroke-white/10",
              placement === "bottom" && "rotate-180",
              placement === "left" && "rotate-90",
              placement === "right" && "-rotate-90"
            )}
          >
            <path d="M0 6L6 0L12 6" strokeWidth={1} fill="inherit" />
          </svg>
        )}
      </AriaOverlayArrow>
      {children}
    </AriaTooltip>
  )
}
