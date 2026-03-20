'use client'

import { cx } from '@openclaw/ui'
import type { Priority } from '@/types/workflow'
import { useState } from 'react'

const BASE_CLASSES = 'inline-flex items-center rounded-full font-bold uppercase select-none'

const SIZE_CLASSES: Record<string, string> = {
  sm: 'text-[10px] px-2 py-1 leading-none tracking-[0.8px]',
  md: 'text-[12px] px-2 py-1 leading-none tracking-[0.8px]',
}

const PRIORITY_COLORS: Record<Priority, { bg: string; color: string }> = {
  critica: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' },
  alta:    { bg: 'rgba(249, 115, 22, 0.12)', color: '#f97316' },
  media:   { bg: 'rgba(234, 179, 8, 0.12)',  color: '#eab308' },
  baja:    { bg: 'rgba(82, 82, 82, 0.12)',   color: 'var(--text-muted)' },
}

const PRIORITY_OPTIONS: Priority[] = ['critica', 'alta', 'media', 'baja']

interface PriorityBadgeProps {
  priority: Priority
  editable?: boolean
  onChange?: (p: Priority) => void
  size?: 'sm' | 'md'
  className?: string
}

export function PriorityBadge({
  priority,
  editable = false,
  onChange,
  size = 'sm',
  className,
}: PriorityBadgeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { bg, color } = PRIORITY_COLORS[priority]

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (editable) {
      setIsEditing(true)
    }
  }

  if (isEditing) {
    return (
      <select
        value={priority}
        autoFocus
        onChange={(e) => {
          onChange?.(e.target.value as Priority)
          setIsEditing(false)
        }}
        onBlur={() => setIsEditing(false)}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '10px',
          padding: '2px 4px',
          cursor: 'pointer',
          outline: 'none',
          minHeight: '28px',
        }}
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }

  return (
    <span
      className={cx(BASE_CLASSES, SIZE_CLASSES[size], className)}
      style={{
        background: bg,
        color: color,
        cursor: editable ? 'pointer' : 'default',
        minHeight: '28px',
        letterSpacing: '0.8px',
        padding: '4px 8px',
      }}
      onClick={handleClick}
      role={editable ? 'button' : undefined}
      aria-label={`Priority: ${priority}`}
    >
      ● {priority}
    </span>
  )
}
