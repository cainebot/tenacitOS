"use client"

import { type ReactNode } from "react"
import { cx } from "../../utils/cx"
import { Avatar, type AvatarProps } from "./avatar"

type AvatarGroupSize = AvatarProps["size"]

export interface AvatarGroupProps {
  /** Avatar items to display */
  avatars: Array<{ src?: string | null; alt?: string; initials?: string }>
  /** Size of all avatars in the group */
  size?: AvatarGroupSize
  /** Maximum number of avatars to show before the "+N" indicator */
  max?: number
  /** Additional class name */
  className?: string
  /** Custom render for the overflow indicator */
  overflowLabel?: (count: number) => ReactNode
}

const overlapBySize: Record<NonNullable<AvatarGroupSize>, string> = {
  xs: "-space-x-1.5",
  sm: "-space-x-2",
  md: "-space-x-2.5",
  lg: "-space-x-3",
  xl: "-space-x-3.5",
  "2xl": "-space-x-4",
}

const sizeClasses: Record<NonNullable<AvatarGroupSize>, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
  xl: "size-14",
  "2xl": "size-16",
}

const overflowTextBySize: Record<NonNullable<AvatarGroupSize>, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-sm",
  lg: "text-md",
  xl: "text-lg",
  "2xl": "text-xl",
}

export function AvatarGroup({
  avatars,
  size = "md",
  max = 5,
  className,
  overflowLabel,
}: AvatarGroupProps) {
  const visible = max > 0 ? avatars.slice(0, max) : avatars
  const overflowCount = Math.max(0, avatars.length - visible.length)

  return (
    <div className={cx("flex items-center", overlapBySize[size!], className)}>
      {visible.map((avatar, index) => (
        <Avatar
          key={avatar.alt ?? index}
          src={avatar.src}
          alt={avatar.alt}
          initials={avatar.initials}
          size={size}
          contrastBorder
          className="ring-2 ring-bg-primary"
        />
      ))}
      {overflowCount > 0 && (
        <div
          className={cx(
            "relative inline-flex shrink-0 items-center justify-center rounded-full bg-tertiary ring-2 ring-bg-primary",
            "font-semibold text-quaternary",
            sizeClasses[size!],
            overflowTextBySize[size!],
          )}
        >
          {overflowLabel ? overflowLabel(overflowCount) : `+${overflowCount}`}
        </div>
      )}
    </div>
  )
}
