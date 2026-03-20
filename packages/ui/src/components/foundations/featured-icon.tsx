"use client"

import type { ReactNode } from "react"

type FeaturedIconVariant = "light" | "dark" | "outline"
type FeaturedIconSize = "xs" | "sm" | "md" | "lg" | "xl"
type FeaturedIconColor = "brand" | "gray" | "success" | "warning" | "error"

interface FeaturedIconProps {
  icon: ReactNode
  variant?: FeaturedIconVariant
  size?: FeaturedIconSize
  color?: FeaturedIconColor
  className?: string
}

const sizeMap: Record<FeaturedIconSize, { container: string; icon: string }> = {
  xs: { container: "w-6 h-6", icon: "w-3 h-3" },
  sm: { container: "w-8 h-8", icon: "w-4 h-4" },
  md: { container: "w-10 h-10", icon: "w-5 h-5" },
  lg: { container: "w-12 h-12", icon: "w-6 h-6" },
  xl: { container: "w-14 h-14", icon: "w-7 h-7" },
}

const colorMap: Record<FeaturedIconColor, { light: string; dark: string; outline: string }> = {
  brand: {
    light: "bg-[var(--brand-100)] text-[var(--brand-600)]",
    dark: "bg-[var(--brand-600)] text-white",
    outline: "border-[var(--brand-300)] text-[var(--brand-600)] border bg-transparent",
  },
  gray: {
    light: "bg-[var(--gray-200)] text-[var(--gray-700)]",
    dark: "bg-[var(--gray-600)] text-white",
    outline: "border-[var(--gray-400)] text-[var(--gray-700)] border bg-transparent",
  },
  success: {
    light: "bg-[var(--success-100)] text-[var(--success-600)]",
    dark: "bg-[var(--success-600)] text-white",
    outline: "border-[var(--success-300)] text-[var(--success-600)] border bg-transparent",
  },
  warning: {
    light: "bg-[var(--warning-100)] text-[var(--warning-600)]",
    dark: "bg-[var(--warning-600)] text-white",
    outline: "border-[var(--warning-300)] text-[var(--warning-600)] border bg-transparent",
  },
  error: {
    light: "bg-[var(--error-100)] text-[var(--error-600)]",
    dark: "bg-[var(--error-600)] text-white",
    outline: "border-[var(--error-300)] text-[var(--error-600)] border bg-transparent",
  },
}

export function FeaturedIcon({
  icon,
  variant = "light",
  size = "md",
  color = "brand",
  className = "",
}: FeaturedIconProps) {
  const sizeClasses = sizeMap[size]
  const colorClasses = colorMap[color][variant]

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full ${sizeClasses.container} ${colorClasses} ${className}`}
    >
      <span className={`inline-flex items-center justify-center ${sizeClasses.icon}`}>
        {icon}
      </span>
    </div>
  )
}

export type {
  FeaturedIconProps,
  FeaturedIconVariant,
  FeaturedIconSize,
  FeaturedIconColor,
}
