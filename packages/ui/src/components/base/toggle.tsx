"use client"

import {
  Switch as AriaSwitch,
  type SwitchProps as AriaSwitchProps,
} from "react-aria-components"
import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

export interface ToggleProps extends Omit<AriaSwitchProps, "className" | "children"> {
  children?: ReactNode
  className?: string
}

export function Toggle({ children, className, ...props }: ToggleProps) {
  return (
    <AriaSwitch
      className={cx(
        "group flex items-center gap-3 text-sm text-white cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {({ isSelected, isFocusVisible }) => (
        <>
          <div
            className={cx(
              "relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0",
              isSelected ? "bg-[#FF3B30]" : "bg-white/15",
              isFocusVisible && "ring-2 ring-[#FF3B30] ring-offset-2 ring-offset-neutral-950"
            )}
          >
            <div
              className={cx(
                "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                isSelected && "translate-x-4"
              )}
            />
          </div>
          {children}
        </>
      )}
    </AriaSwitch>
  )
}
