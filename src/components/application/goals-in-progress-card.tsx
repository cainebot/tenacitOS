'use client'

import { useState } from 'react'
import { cx } from '@circos/ui'
import { Target04, ChevronDown } from '@untitledui/icons'
import { GoalItem } from './goal-item'
import type { GoalRow } from '@/types/project'

interface GoalsInProgressCardProps {
  goals: GoalRow[]
  onGoalClick?: (goalId: string) => void
}

export function GoalsInProgressCard({ goals, onGoalClick }: GoalsInProgressCardProps) {
  const [expanded, setExpanded] = useState(true)

  // Only top-level goals
  const topLevelGoals = goals.filter((g) => !g.parent_id)

  // In Progress: active goals with actual progress
  const inProgressGoals = topLevelGoals.filter((goal) => {
    if (goal.status !== 'active') return false
    if (goal.goal_type === 'numeric') {
      return (goal.current_value ?? 0) > (goal.initial_value ?? 0)
    }
    if (goal.goal_type === 'boolean') {
      return goal.boolean_current === 'in_progress'
    }
    return false
  })

  // Completed goals
  const completedGoals = topLevelGoals.filter((g) => g.status === 'completed')

  const hasGoals = inProgressGoals.length > 0 || completedGoals.length > 0

  return (
    <div className="rounded-xl border border-secondary bg-primary p-4">
      {/* Collapsible header */}
      <button
        type="button"
        className="flex flex-row items-center gap-2 w-full cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <Target04 className="size-5 fg-quaternary shrink-0" />
        <span className="text-xl font-semibold text-secondary">Goals in progress</span>
        <ChevronDown
          className={cx(
            'size-4 fg-quaternary ml-auto transition-transform duration-200',
            !expanded && '-rotate-90',
          )}
        />
      </button>

      {/* Goal list */}
      {expanded && (
        <div className="mt-3 flex flex-col gap-1">
          {!hasGoals ? (
            <p className="text-sm text-tertiary text-center py-2">
              Inicia una goal para ver su progreso
            </p>
          ) : (
            <>
              {inProgressGoals.map((goal) => (
                <GoalItem
                  key={goal.goal_id}
                  title={goal.title}
                  isComplete={false}
                  onClick={onGoalClick ? () => onGoalClick(goal.goal_id) : undefined}
                />
              ))}
              {completedGoals.map((goal) => (
                <GoalItem
                  key={goal.goal_id}
                  title={goal.title}
                  isComplete={true}
                  onClick={onGoalClick ? () => onGoalClick(goal.goal_id) : undefined}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
