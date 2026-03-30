"use client"

import { type ReactNode } from "react"
import { cx } from "../../utils/cx"
import { Badge } from "../base/badge"

// ─── AgentSubNav ────────────────────────────────────────────────────

export interface AgentSubNavProps {
  /** Section title */
  title?: string
  /** Count shown next to the title */
  count?: number
  /** Content: agent list items, dividers, etc. */
  children: ReactNode
  className?: string
}

export function AgentSubNav({
  title = "Agents",
  count,
  children,
  className,
}: AgentSubNavProps) {
  return (
    <div
      className={cx(
        "flex h-full w-[268px] flex-col items-start",
        className,
      )}
    >
      <div className="flex w-full flex-1 flex-col gap-2 pt-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-2 px-3">
          <p className="text-sm font-semibold text-brand-secondary">
            {title}
          </p>
          {count != null && (
            <Badge type="color" color="gray" size="sm">
              {count}
            </Badge>
          )}
        </div>

        {/* Agent list content */}
        {children}
      </div>
    </div>
  )
}

// ─── AgentSubNavDivider ─────────────────────────────────────────────

export function AgentSubNavDivider() {
  return <div className="my-1 h-px w-full bg-primary/10" />
}
