"use client"

import { type ReactNode } from "react"
import { cx } from "../../utils/cx"
import { Avatar, type AvatarProps } from "../base/avatar"
import { Badge, type BadgeColor } from "../base/badge"

// ─── AgentListItem ──────────────────────────────────────────────────

export interface AgentListItemProps {
  /** Avatar image src */
  avatarSrc?: AvatarProps["src"]
  /** Avatar alt text */
  avatarAlt?: string
  /** Avatar placeholder icon */
  avatarIcon?: AvatarProps["placeholderIcon"]
  /** Primary label */
  name: string
  /** Secondary label (e.g. "7 total") */
  subtitle?: string
  /** Trailing badge text (e.g. "5 active") */
  badgeText?: string
  /** Badge color */
  badgeColor?: BadgeColor
  /** Active/selected state — shows left brand border + brand background */
  active?: boolean
  /** Click handler */
  onClick?: () => void
  className?: string
}

export function AgentListItem({
  avatarSrc,
  avatarAlt,
  avatarIcon,
  name,
  subtitle,
  badgeText,
  badgeColor = "success",
  active = false,
  onClick,
  className,
}: AgentListItemProps) {
  const Comp = onClick ? "button" : "div"

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cx(
        "flex w-full items-center justify-between px-3 py-1",
        onClick && "cursor-pointer",
        active && "border-l-2 border-brand-600 bg-bg-brand-primary",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar
          size="md"
          src={avatarSrc}
          alt={avatarAlt}
          placeholderIcon={avatarIcon}
          contrastBorder
        />
        <div className="flex flex-col items-start">
          <p className="text-sm font-semibold text-primary">{name}</p>
          {subtitle && (
            <p className="text-sm text-tertiary">{subtitle}</p>
          )}
        </div>
      </div>
      {badgeText && (
        <Badge type="pill-color" color={badgeColor} size="sm">
          {badgeText}
        </Badge>
      )}
    </Comp>
  )
}
