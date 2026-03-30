"use client"

import { type ReactNode } from "react"
import { cx } from "../../utils/cx"
import { Avatar } from "../base/avatar"
import { Dot } from "../foundations/dot-icon"
import { FileTypeIcon } from "../foundations/file-type-icon"

// ─── FeedItem ───────────────────────────────────────────────────────

export interface FeedItemProps {
  avatarSrc?: string
  avatarAlt?: string
  avatarStatus?: "online" | "offline"
  name: string
  timestamp: string
  /** Rich text describing the action, e.g. <>Invited <a>Lana Steiner</a> to the team</> */
  action: ReactNode
  /** sm = 32px avatar, md = 48px avatar */
  size?: "sm" | "md"
  /** Show vertical connector line below avatar (for stacked items) */
  connector?: boolean
  /** Show green notification dot (top-right) */
  newDot?: boolean
  /** Optional supporting content: badges, file card, or comment bubble */
  supportingContent?: ReactNode
  className?: string
}

const avatarSizeMap = { sm: "sm", md: "lg" } as const

export function FeedItem({
  avatarSrc,
  avatarAlt,
  avatarStatus,
  name,
  timestamp,
  action,
  size = "md",
  connector = false,
  newDot = false,
  supportingContent,
  className,
}: FeedItemProps) {
  const hasSupportingContent = !!supportingContent

  return (
    <div className={cx("relative flex gap-3 items-start", className)}>
      {/* Left column: avatar + connector */}
      <div className="flex flex-col items-center shrink-0 self-stretch">
        <Avatar
          size={avatarSizeMap[size]}
          src={avatarSrc}
          alt={avatarAlt}
          status={avatarStatus}
        />
        {connector && (
          <div className="mt-1.5 w-px flex-1 bg-primary/10" />
        )}
      </div>

      {/* Right column: content */}
      <div
        className={cx(
          "flex flex-1 flex-col items-start min-w-0",
          hasSupportingContent && "gap-3",
          connector && "pb-8",
        )}
      >
        {/* Header: name + timestamp + action */}
        <div className="flex flex-col items-start w-full">
          <div className="flex items-center gap-2 w-full">
            <p className="text-sm font-medium text-secondary">{name}</p>
            <p className="text-xs text-tertiary">{timestamp}</p>
          </div>
          <p className="text-sm text-tertiary w-full [&_a]:font-medium [&_a]:text-brand-700">{action}</p>
        </div>

        {/* Supporting content */}
        {supportingContent}
      </div>

      {/* New dot indicator */}
      {newDot && (
        <Dot
          size="md"
          className="absolute top-0 right-0 text-fg-success-secondary"
        />
      )}
    </div>
  )
}

// ─── FeedItemFileCard ───────────────────────────────────────────────

export interface FeedItemFileCardProps {
  fileName: string
  fileSize: string
  /** File extension label, e.g. "PDF" */
  fileType: string
  /** Tailwind bg class for the file type label color */
  fileTypeColor?: string
  className?: string
}

export function FeedItemFileCard({
  fileName,
  fileSize,
  fileType,
  fileTypeColor,
  className,
}: FeedItemFileCardProps) {
  return (
    <div className={cx("flex items-start gap-3 w-full", className)}>
      <FileTypeIcon fileType={fileType} color={fileTypeColor} />
      <div className="flex flex-1 flex-col min-w-0">
        <p className="text-sm font-medium text-secondary truncate">{fileName}</p>
        <p className="text-sm text-tertiary">{fileSize}</p>
      </div>
    </div>
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
        "w-full rounded-tr-lg rounded-br-lg rounded-bl-lg border border-secondary bg-primary_alt px-3 py-2.5",
        className,
      )}
    >
      <p className="text-sm text-secondary">{children}</p>
    </div>
  )
}
