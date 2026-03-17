"use client";

import { cn } from "@/lib/cn";

const STATUS_BADGE_CLASS: Record<string, string> = {
  working: 'badge-positive',
  thinking: 'badge-positive',
  paused: 'badge-warning',
  idle: 'badge-info',
  queued: 'badge-info',
  offline: 'badge-negative',
  error: 'badge-negative',
};

const DEFAULT_BADGE_CLASS = 'badge-info';

interface StatusPillProps {
  status: string;
  className?: string;
}

/**
 * A badge pill showing the agent status with the appropriate color variant
 * from the design system (badge-positive, badge-warning, badge-info, badge-negative).
 */
export function StatusPill({ status, className }: StatusPillProps) {
  const badgeClass = STATUS_BADGE_CLASS[status.toLowerCase()] ?? DEFAULT_BADGE_CLASS;

  return (
    <span className={cn("badge", badgeClass, className)}>
      {status}
    </span>
  );
}
