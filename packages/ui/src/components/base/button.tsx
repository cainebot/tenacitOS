"use client"

import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
} from "react-aria-components"
import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

const variantStyles = {
  primary:
    "bg-[#FF3B30] text-white hover:bg-[#E0342B] pressed:bg-[#CC2F27] border border-transparent",
  secondary:
    "bg-white/10 text-white hover:bg-white/15 pressed:bg-white/20 border border-white/10",
  outline:
    "bg-transparent text-white hover:bg-white/5 pressed:bg-white/10 border border-white/20",
  ghost:
    "bg-transparent text-white hover:bg-white/5 pressed:bg-white/10 border border-transparent",
  danger:
    "bg-red-600 text-white hover:bg-red-700 pressed:bg-red-800 border border-transparent",
  link: "bg-transparent text-[#FF3B30] hover:text-[#E0342B] pressed:text-[#CC2F27] border-none underline-offset-4 hover:underline p-0 h-auto",
} as const

const sizeStyles = {
  xs: "text-xs px-2 py-1 gap-1 rounded-md h-7",
  sm: "text-sm px-3 py-1.5 gap-1.5 rounded-md h-8",
  md: "text-sm px-3.5 py-2 gap-1.5 rounded-lg h-9",
  lg: "text-base px-4 py-2.5 gap-2 rounded-lg h-10",
  xl: "text-base px-5 py-3 gap-2 rounded-lg h-11",
  "2xl": "text-lg px-6 py-3.5 gap-2.5 rounded-xl h-12",
} as const

export type ButtonVariant = keyof typeof variantStyles
export type ButtonSize = keyof typeof sizeStyles

export interface ButtonProps extends Omit<AriaButtonProps, "className"> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  iconLeading?: ReactNode
  iconTrailing?: ReactNode
  children?: ReactNode
  className?: string
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  isDisabled,
  iconLeading,
  iconTrailing,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      isDisabled={isDisabled || isLoading}
      className={cx(
        "inline-flex items-center justify-center font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        iconLeading && <span className="shrink-0">{iconLeading}</span>
      )}
      {children}
      {iconTrailing && !isLoading && (
        <span className="shrink-0">{iconTrailing}</span>
      )}
    </AriaButton>
  )
}
