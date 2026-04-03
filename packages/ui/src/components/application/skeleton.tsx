"use client"

import { cx } from "../../utils/cx"

export type SkeletonVariant = "text" | "circle" | "rect" | "card"
export type SkeletonSize = "sm" | "md" | "lg"

export interface SkeletonProps {
  variant?: SkeletonVariant
  size?: SkeletonSize
  className?: string
  /** Width override (e.g., "w-32", "w-full") */
  width?: string
  /** Height override (e.g., "h-8") */
  height?: string
}

const sizeStyles: Record<SkeletonVariant, Record<SkeletonSize, string>> = {
  text: {
    sm: "h-3 w-24",
    md: "h-4 w-32",
    lg: "h-5 w-48",
  },
  circle: {
    sm: "size-8",
    md: "size-10",
    lg: "size-12",
  },
  rect: {
    sm: "h-8 w-full",
    md: "h-12 w-full",
    lg: "h-16 w-full",
  },
  card: {
    sm: "h-24 w-full",
    md: "h-32 w-full",
    lg: "h-48 w-full",
  },
}

const shapeStyles: Record<SkeletonVariant, string> = {
  text: "rounded-md",
  circle: "rounded-full",
  rect: "rounded-lg",
  card: "rounded-xl",
}

export function Skeleton({
  variant = "rect",
  size = "md",
  className,
  width,
  height,
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cx(
        "relative overflow-hidden bg-tertiary",
        shapeStyles[variant],
        sizeStyles[variant][size],
        width,
        height,
        className,
      )}
    >
      <div
        className={cx(
          "absolute inset-0 -translate-x-full animate-shimmer",
          "bg-gradient-to-r from-transparent via-[var(--bg-quaternary)] to-transparent",
          "motion-reduce:animate-none",
        )}
        aria-hidden="true"
      />
      <span className="sr-only">Loading</span>
    </div>
  )
}
