'use client'

import { type FC } from 'react'
import { Badge, Button, PageHeader, cx } from '@circos/ui'
import { Target04, ChevronRight, HomeLine } from '@untitledui/icons'
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

// ---------------------------------------------------------------------------
// GoalNavBreadcrumb — navigation breadcrumb for goal detail view (D-19, D-24)
// Renders: Home > Project > Overview > Goal (> Sub Goal)
// Used inside GoalDetailView within the project layout.
// ---------------------------------------------------------------------------

export interface GoalNavBreadcrumbProps {
  projectName: string
  projectSlug: string
  goalTitle: string
  goalId?: string        // parent goal ID, used when viewing a sub-goal
  subGoalTitle?: string  // if present, renders as leaf breadcrumb
}

export function GoalNavBreadcrumb({
  projectName,
  projectSlug,
  goalTitle,
  goalId,
  subGoalTitle,
}: GoalNavBreadcrumbProps) {
  const breadcrumbs = [
    { icon: HomeLine, href: '/' },
    { label: projectName, href: `/projects/${projectSlug}` },
    { label: 'Overview', href: `/projects/${projectSlug}?tab=overview` },
  ]

  if (subGoalTitle) {
    breadcrumbs.push({
      label: goalTitle,
      href: `/projects/${projectSlug}?tab=overview&goal=${goalId}`,
    })
    breadcrumbs.push({ label: subGoalTitle })
  } else {
    breadcrumbs.push({ label: goalTitle })
  }

  return <PageHeader title="" breadcrumbs={breadcrumbs} bordered={false} />
}
