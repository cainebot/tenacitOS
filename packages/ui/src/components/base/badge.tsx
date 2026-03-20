"use client"

import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

const variantStyles = {
  default:
    "bg-white/10 text-white border-white/10",
  brand:
    "bg-[#FF3B30]/15 text-[#FF8A84] border-[#FF3B30]/20",
  success:
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  warning:
    "bg-amber-500/15 text-amber-400 border-amber-500/20",
  error:
    "bg-red-500/15 text-red-400 border-red-500/20",
  info:
    "bg-blue-500/15 text-blue-400 border-blue-500/20",
  gray:
    "bg-neutral-500/15 text-neutral-400 border-neutral-500/20",
} as const

const sizeStyles = {
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
  lg: "text-sm px-3 py-1",
} as const

export type BadgeVariant = keyof typeof variantStyles
export type BadgeSize = keyof typeof sizeStyles

export interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  children: ReactNode
  className?: string
}

export function Badge({
  variant = "default",
  size = "md",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full font-medium border",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  )
}
