"use client";

import { cn } from "@/lib/cn";

const AGENT_STATUS_COLORS: Record<string, string> = {
  working: 'var(--positive)',
  thinking: 'var(--positive)',
  paused: 'var(--warning)',
  idle: 'var(--info)',
  queued: 'var(--info)',
  offline: 'var(--negative)',
  error: 'var(--negative)',
};

const DEFAULT_COLOR = 'var(--text-muted)';

/**
 * Returns the CSS color value for a given agent status string.
 * Useful when you need the color without the full component.
 */
export function statusDotClass(status: string): string {
  return AGENT_STATUS_COLORS[status.toLowerCase()] ?? DEFAULT_COLOR;
}

interface StatusDotProps {
  status: string;
  variant?: 'agent' | 'task';
  className?: string;
}

/**
 * A small colored dot indicating the status of an agent or task.
 * Uses CSS variable colors for each status state.
 */
export function StatusDot({ status, variant = 'agent', className }: StatusDotProps) {
  const color = statusDotClass(status);
  const size = variant === 'task' ? '6px' : '8px';

  return (
    <span
      className={cn("inline-block rounded-full shrink-0", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
      }}
      aria-label={`Status: ${status}`}
    />
  );
}
