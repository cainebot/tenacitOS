'use client'

import { cx } from '@circos/ui'
import { Target04 } from '@untitledui/icons'
import { GoalItem } from './goal-item'
import type { GoalRow } from '@/types/project'

const SIDEBAR_COMPLETED_DAYS = 20

interface GoalsInProgressCardProps {
  goals: GoalRow[]
  onGoalClick?: (goalId: string) => void
}

export function GoalsInProgressCard({ goals, onGoalClick }: GoalsInProgressCardProps) {
  const sidebarGoals = goals.filter((goal) => {
    if (goal.parent_id) return false // Only top-level goals in sidebar
    if (goal.status === 'active') return true
    if (goal.status === 'completed' && goal.completed_at) {
      const daysSinceCompletion =
        (Date.now() - new Date(goal.completed_at).getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceCompletion <= SIDEBAR_COMPLETED_DAYS
    }
    return false
  })

  return (
    <div className={cx('rounded-xl border border-secondary bg-primary p-4')}>
      {/* Header */}
      <div className="flex flex-row items-center gap-2">
        <Target04 className="size-5 fg-quaternary shrink-0" />
        <span className="text-sm font-semibold text-secondary">Goals in progress</span>
      </div>

      {/* Goal list */}
      <div className="mt-3 flex flex-col gap-1">
        {sidebarGoals.length === 0 ? (
          <p className="text-sm text-tertiary text-center py-2">No goals defined yet</p>
        ) : (
          sidebarGoals.map((goal) => (
            <GoalItem
              key={goal.goal_id}
              title={goal.title}
              isComplete={goal.status === 'completed'}
              onClick={onGoalClick ? () => onGoalClick(goal.goal_id) : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}
