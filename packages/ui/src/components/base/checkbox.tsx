"use client"

import {
  Checkbox as AriaCheckbox,
  type CheckboxProps as AriaCheckboxProps,
} from "react-aria-components"
import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

export interface CheckboxProps extends Omit<AriaCheckboxProps, "className" | "children"> {
  children?: ReactNode
  className?: string
}

export function Checkbox({ children, className, ...props }: CheckboxProps) {
  return (
    <AriaCheckbox
      className={cx(
        "group flex items-center gap-2 text-sm text-white cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {({ isSelected, isIndeterminate, isFocusVisible }) => (
        <>
          <div
            className={cx(
              "flex items-center justify-center w-4 h-4 rounded border transition-colors duration-150 shrink-0",
              isSelected || isIndeterminate
                ? "bg-[#FF3B30] border-[#FF3B30]"
                : "bg-white/5 border-white/20 group-hover:border-white/40",
              isFocusVisible && "ring-2 ring-[#FF3B30] ring-offset-2 ring-offset-neutral-950"
            )}
          >
            {isIndeterminate ? (
              <svg
                className="w-3 h-3 text-white"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M2.5 6H9.5"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </svg>
            ) : isSelected ? (
              <svg
                className="w-3 h-3 text-white"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M2.5 6L5 8.5L9.5 3.5"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </div>
          {children}
        </>
      )}
    </AriaCheckbox>
  )
}
