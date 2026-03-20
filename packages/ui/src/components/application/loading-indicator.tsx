"use client"

import { cx } from "../../utils/cx"

const sizeStyles = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
} as const

export type LoadingSize = keyof typeof sizeStyles

export interface LoadingIndicatorProps {
  size?: LoadingSize
  label?: string
  className?: string
}

export function LoadingIndicator({
  size = "md",
  label,
  className,
}: LoadingIndicatorProps) {
  return (
    <div
      role="status"
      className={cx("flex flex-col items-center justify-center gap-3", className)}
    >
      <svg
        className={cx("animate-spin text-[#FF3B30]", sizeStyles[size])}
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
      {label && <span className="text-sm text-white/50">{label}</span>}
      <span className="sr-only">{label || "Loading"}</span>
    </div>
  )
}
