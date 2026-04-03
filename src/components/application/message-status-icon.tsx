'use client'

import { Tooltip, TooltipTrigger, cx } from '@circos/ui'
import { AlertCircle } from '@untitledui/icons'

// ── Types ────────────────────────────────────────────────────────────────────

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'

export interface MessageStatusIconProps {
  /** Delivery status of the message */
  status?: MessageStatus
  /** Timestamp shown in the tooltip for read status (e.g. "2:20 PM") */
  readAt?: string
  className?: string
}

// ── SVG icons ────────────────────────────────────────────────────────────────

/** Single check — message sent, not yet read */
function SingleCheck({ className }: { className?: string }) {
  return (
    <svg
      className={cx('size-4', className)}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 8.5L6.5 11.5L12.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Double check — message read */
function DoubleCheck({ className }: { className?: string }) {
  return (
    <svg
      className={cx('size-4', className)}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1.5 8.5L4.5 11.5L10.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 11.5L14.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

const tooltipLabels: Record<MessageStatus, string> = {
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
}

export function MessageStatusIcon({
  status = 'sent',
  readAt,
  className,
}: MessageStatusIconProps) {
  const tooltipTitle =
    status === 'read' && readAt
      ? `Read ${readAt}`
      : tooltipLabels[status]

  return (
    <Tooltip title={tooltipTitle} placement="top" delay={200}>
      <TooltipTrigger
        className={cx('shrink-0 flex items-center justify-center', className)}
        aria-label={tooltipTitle}
      >
        {status === 'sent' && (
          <SingleCheck className="text-fg-quaternary" />
        )}
        {status === 'delivered' && (
          <DoubleCheck className="text-fg-quaternary" />
        )}
        {status === 'read' && (
          <DoubleCheck className="text-fg-brand-primary" />
        )}
        {status === 'failed' && (
          <AlertCircle className="size-4 text-fg-error-primary" />
        )}
      </TooltipTrigger>
    </Tooltip>
  )
}
