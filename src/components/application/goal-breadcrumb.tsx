'use client'

import { type FC } from 'react'
import { Badge, Button, cx } from '@circos/ui'
import { Target04, ChevronRight } from '@untitledui/icons'
import type { GoalRow } from '@/types/project'

interface GoalBreadcrumbProps {
  resolvedGoal: GoalRow | null
  parentGoal?: GoalRow | null
  contextSource: string
  isOverride: boolean
  onOverrideClick?: () => void
  className?: string
}

export const GoalBreadcrumb: FC<GoalBreadcrumbProps> = ({
  resolvedGoal,
  parentGoal,
  contextSource,
  isOverride,
  onOverrideClick,
  className,
}) => {
  if (!resolvedGoal) return null

  const iconColor = isOverride ? 'fg-warning-primary' : 'fg-brand-primary'

  // Build breadcrumb parts: company goal <- dept goal <- context source
  // If resolvedGoal is a department goal, show parent <- resolvedGoal <- contextSource
  // If resolvedGoal is a company goal, show resolvedGoal <- contextSource
  const parts: string[] = []

  if (parentGoal) {
    parts.push(parentGoal.title)
  }
  parts.push(resolvedGoal.title)
  if (contextSource) {
    parts.push(contextSource)
  }

  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-1.5 min-w-0">
        <Target04
          className={cx('size-4 shrink-0', iconColor)}
        />
        <span className="text-sm text-secondary truncate">
          {parts.join(' \u2190 ')}
        </span>
        {isOverride && (
          <Badge color="warning" size="sm">
            Override
          </Badge>
        )}
      </div>
      {isOverride && onOverrideClick && (
        <div className="pl-[22px]">
          <Button
            color="link-color"
            size="sm"
            onClick={onOverrideClick}
          >
            Vincular a otro goal
          </Button>
        </div>
      )}
    </div>
  )
}
