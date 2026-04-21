"use client"

import type { ReactNode } from "react"
import { cx } from "../../utils/cx"
import { Avatar } from "./avatar"

// ─── Size Config ────────────────────────────────────────────────────

const avatarSizeMap = {
  sm: "sm" as const,
  md: "lg" as const,
}

// ─── FeedItem ───────────────────────────────────────────────────────

export interface FeedItemProps {
  /** Avatar image URL */
  avatarSrc?: string
  /** Avatar alt text */
  avatarAlt?: string
  /** Avatar initials fallback */
  avatarInitials?: string
  /** Online/offline status indicator */
  avatarStatus?: "online" | "offline"
  /** User display name */
  name: string
  /** Relative timestamp (e.g. "2 mins ago") */
  timestamp: string
  /** Action description — use FeedItemLink for inline links. Omit for plain text posts. */
  action?: ReactNode
  /** Size variant: sm (32px avatar) or md (48px avatar) */
  size?: "sm" | "md"
  /** Show vertical connector line to the next item */
  connector?: boolean
  /** Show unread notification dot */
  isNew?: boolean
  /** Supporting content: badges, file attachment, or comment bubble */
  children?: ReactNode
  className?: string
}

export function FeedItem({
  avatarSrc,
  avatarAlt,
  avatarInitials,
  avatarStatus,
  name,
  timestamp,
  action,
  size = "md",
  connector = false,
  isNew = false,
  children,
  className,
}: FeedItemProps) {
  return (
    <div className={cx("relative flex items-start gap-3", className)}>
      {/* Avatar column with optional connector */}
      <div className={cx("flex shrink-0 flex-col items-center self-stretch", connector && "gap-1.5 pb-1.5")}>
        <Avatar
          src={avatarSrc}
          alt={avatarAlt}
          initials={avatarInitials}
          status={avatarStatus}
          size={avatarSizeMap[size]}
        />
        {connector && <div className="w-0.5 flex-1 rounded-full bg-border-secondary" />}
      </div>

      {/* Content */}
      <div
        className={cx(
          "flex min-w-0 flex-1 flex-col",
          !!children && (action ? "gap-3" : "gap-1"),
          connector && "pb-8",
        )}
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-sm font-medium text-secondary">{name}</span>
            <span className="text-xs text-tertiary">{timestamp}</span>
          </div>
          {action && <p className="text-sm text-tertiary">{action}</p>}
        </div>
        {children}
      </div>

      {/* Unread dot */}
      {isNew && <span className="absolute right-0 top-0.5 size-2 rounded-full bg-fg-success-secondary" />}
    </div>
  )
}

// ─── FeedItemLink ───────────────────────────────────────────────────

export interface FeedItemLinkProps {
  children: ReactNode
  href?: string
  onClick?: () => void
  className?: string
}

export function FeedItemLink({ children, href, onClick, className }: FeedItemLinkProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cx("font-medium text-brand-secondary hover:underline", className)}
    >
      {children}
    </a>
  )
}

// ─── FeedItemComment ────────────────────────────────────────────────

export interface FeedItemCommentProps {
  children: ReactNode
  className?: string
}

export function FeedItemComment({ children, className }: FeedItemCommentProps) {
  return (
    <div
      className={cx(
        "w-full rounded-r-lg rounded-bl-lg border border-secondary bg-primary px-3 py-2.5",
        className,
      )}
    >
      <p className="text-sm text-secondary">{children}</p>
    </div>
  )
}

// ─── FeedItemText ───────────────────────────────────────────────────
// Plain text supporting item (no bubble) — the "Text Alt" variant

export interface FeedItemTextProps {
  children: ReactNode
  className?: string
}

export function FeedItemText({ children, className }: FeedItemTextProps) {
  return <p className={cx("text-sm text-secondary", className)}>{children}</p>
}

// ─── FeedItemFile ───────────────────────────────────────────────────

export interface FeedItemFileProps {
  /** File name to display */
  fileName: string
  /** File size (e.g. "720 KB") */
  fileSize: string
  /** Short file type label (e.g. "PDF", "DOC") */
  fileType?: string
  /** Background color for file type label */
  fileTypeColor?: string
  /** Custom icon to replace the default file icon */
  icon?: ReactNode
  className?: string
}

export function FeedItemFile({
  fileName,
  fileSize,
  fileType,
  fileTypeColor = "bg-error-solid",
  icon,
  className,
}: FeedItemFileProps) {
  return (
    <div className={cx("flex items-start gap-3", className)}>
      {icon || (
        <div className="relative size-10 shrink-0">
          <svg className="size-full" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M7 4a2 2 0 0 1 2-2h14.586a1 1 0 0 1 .707.293l8.414 8.414a1 1 0 0 1 .293.707V36a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V4Z"
              className="fill-bg-secondary stroke-border-secondary"
            />
            <path d="M23 2v7a2 2 0 0 0 2 2h7L23 2Z" className="fill-bg-tertiary" />
          </svg>
          {fileType && (
            <span
              className={cx(
                "absolute bottom-1.5 left-0.5 rounded-sm px-1 py-0.5 text-[10px] font-bold leading-none text-white",
                fileTypeColor,
              )}
            >
              {fileType}
            </span>
          )}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-secondary">{fileName}</span>
        <span className="text-sm text-tertiary">{fileSize}</span>
      </div>
    </div>
  )
}
