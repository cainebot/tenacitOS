'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ProgressBar, Skeleton, cx } from '@circos/ui'
import { Plus, Target04, ArrowNarrowLeft } from '@untitledui/icons'
import { GoalProgress } from './goal-progress'
import { GoalPropertiesPanel, type EpicOption } from './goal-properties-panel'
import { GoalNavBreadcrumb } from './goal-breadcrumb'
import { useGoalDetail } from '@/hooks/use-goal-detail'
import type { GoalRow } from '@/types/project'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoalDetailViewProps {
  goalId: string
  subGoalId?: string | null
  projectSlug: string
  projectName: string
  onBack: () => void  // Navigate back to Overview
}

// ---------------------------------------------------------------------------
// Sub-goal table cell helpers
// ---------------------------------------------------------------------------

function SubGoalCellText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-1 items-center gap-3 border-b border-secondary h-[72px] px-6 py-4 min-w-0", className)}>
      <p className="flex-1 text-sm font-medium text-primary truncate min-w-0">{children}</p>
    </div>
  )
}

function SubGoalCellProgress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx("flex items-center border-b border-secondary h-[72px] px-6 py-4 w-[266px] shrink-0", className)}>
      <div className="flex-1 min-w-0">
        <ProgressBar value={value} labelPosition="right" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcSubGoalProgress(sg: GoalRow): number {
  if (sg.goal_type === 'boolean') {
    return sg.boolean_current === 'complete' ? 100 : 0
  }
  if (
    sg.target_value !== null &&
    sg.initial_value !== null &&
    sg.current_value !== null &&
    sg.target_value !== sg.initial_value
  ) {
    return Math.max(
      0,
      Math.min(
        100,
        ((sg.current_value - sg.initial_value) /
          (sg.target_value - sg.initial_value)) *
          100
      )
    )
  }
  return 0
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function GoalDetailSkeleton() {
  // Phase 91.2-02 (D-11): migrated from hand-rolled pulse divs to @circos/ui
  // Skeleton primitive. Tailwind size classes preserved 1:1 to keep visual
  // dimensions identical (feedback_no_frontend_aesthetic_changes).
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-2/3 rounded-lg" />
      <div className="grid grid-cols-[1fr_403px] gap-6">
        <div className="space-y-4">
          <Skeleton variant="text" className="h-4 w-full" />
          <Skeleton variant="text" className="h-4 w-5/6" />
          <Skeleton variant="text" className="h-4 w-4/6" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoalDetailView({
  goalId,
  subGoalId,
  projectSlug,
  projectName,
  onBack,
}: GoalDetailViewProps) {
  const router = useRouter()

  // If subGoalId is present, show sub-goal detail; otherwise show goal detail
  const activeGoalId = subGoalId ?? goalId

  const {
    goal,
    subGoals,
    loading,
    error,
    updateGoal,
    createSubGoal,
  } = useGoalDetail(activeGoalId)

  // For parent goal context when viewing a sub-goal (breadcrumb needs parent title)
  const { goal: parentGoal } = useGoalDetail(subGoalId ? goalId : null)

  // Epics for the properties panel — fetch cards with card_type='epic'
  const [epics, setEpics] = useState<EpicOption[]>([])
  useEffect(() => {
    if (!goal?.project_id) return
    fetch(`/api/cards?project_id=${goal.project_id}&card_type=epic`)
      .then((r) => (r.ok ? r.json() : []))
      .then(
        (cards: Array<{ card_id: string; code: string; title: string }>) => {
          setEpics(
            cards.map((c) => ({
              card_id: c.card_id,
              code: c.code ?? '',
              title: c.title,
            }))
          )
        }
      )
      .catch(() => {})
  }, [goal?.project_id])

  // Local title state for controlled input with debounce
  const [localTitle, setLocalTitle] = useState<string>('')
  useEffect(() => {
    if (goal?.title !== undefined) {
      setLocalTitle(goal.title)
    }
  }, [goal?.title])

  // ----- Render -----

  if (loading) {
    return (
      <div className="px-8 py-6">
        <GoalDetailSkeleton />
      </div>
    )
  }

  if (error || !goal) {
    return (
      <div className="px-8 py-6 flex flex-col items-center justify-center gap-4">
        <Target04 className="size-10 fg-quaternary" />
        <p className="text-sm text-tertiary">
          {error ?? 'Goal not found'}
        </p>
        <Button
          size="sm"
          color="secondary"
          iconLeading={ArrowNarrowLeft}
          onClick={onBack}
        >
          Back to Overview
        </Button>
      </div>
    )
  }

  const isSubGoalView = Boolean(subGoalId) || Boolean(goal.parent_id)

  return (
    <div className="px-8 py-6">
      {/* Breadcrumb — Home > Project > Overview > Goal (> Sub Goal) per D-19 */}
      <GoalNavBreadcrumb
        projectName={projectName}
        projectSlug={projectSlug}
        goalTitle={subGoalId ? (parentGoal?.title ?? 'Goal') : goal.title}
        goalId={subGoalId ? goalId : undefined}
        subGoalTitle={subGoalId ? goal.title : undefined}
      />

      <div className="grid grid-cols-[1fr_403px] gap-6 mt-6">
        {/* Left column — goal content */}
        <div className="min-w-0 space-y-6">
          {/* Editable title — per D-18: cannot save without title */}
          <div>
            <input
              type="text"
              value={localTitle}
              onChange={(e) => {
                const value = e.target.value
                setLocalTitle(value)
                if (value.trim()) {
                  updateGoal({ title: value })
                }
              }}
              placeholder="Goal title"
              className={cx(
                'w-full bg-transparent text-2xl font-semibold text-primary',
                'border-0 outline-none focus:ring-0 placeholder:text-placeholder',
                'hover:bg-primary_hover rounded-lg transition-colors duration-100',
                'py-1 px-2'
              )}
              aria-label="Goal title"
            />
          </div>

          {/* Description */}
          <div>
            <textarea
              value={goal.description ?? ''}
              onChange={(e) => updateGoal({ description: e.target.value })}
              placeholder="Describe this goal..."
              rows={4}
              className={cx(
                'w-full bg-transparent text-sm text-secondary',
                'border-0 p-3 rounded-lg',
                'outline-none focus:ring-0 resize-none',
                'hover:bg-primary_hover transition-colors duration-100',
                'placeholder:text-placeholder'
              )}
              aria-label="Goal description"
            />
          </div>

          {/* Progress section */}
          <div>
            <GoalProgress
              goalType={goal.goal_type}
              numberFormat={goal.number_format}
              initialValue={goal.initial_value}
              currentValue={goal.current_value}
              targetValue={goal.target_value}
              booleanInitial={goal.boolean_initial}
              booleanCurrent={goal.boolean_current}
              onUpdate={(fields) => updateGoal(fields)}
            />
          </div>

          {/* Sub Goals section — ONLY for parent goals (D-13: max 1 level depth) */}
          {!isSubGoalView && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-secondary">
                  Sub Goals
                </h3>
                <Button
                  size="sm"
                  color="secondary"
                  iconLeading={Plus}
                  onClick={async () => {
                    const subGoal = await createSubGoal('Untitled Sub Goal')
                    if (subGoal) {
                      // Navigate to sub-goal detail using router.push per plan requirement
                      router.push(
                        `/projects/${projectSlug}?tab=overview&goal=${goalId}&subgoal=${subGoal.goal_id}`,
                        { scroll: false }
                      )
                    }
                  }}
                >
                  Sub Goal
                </Button>
              </div>

              {subGoals.length === 0 ? (
                /* Empty state per D-21 */
                <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-secondary gap-3">
                  <Target04 className="size-8 fg-quaternary" />
                  <p className="text-sm text-tertiary">No sub-goals yet</p>
                </div>
              ) : (
                /* Sub-goals table matching overview GoalsTable pattern */
                <div className="overflow-clip rounded-2xl border border-primary bg-primary_alt">
                  {/* Table header */}
                  <div className="flex items-center">
                    <div className="flex flex-1 items-center bg-secondary border-b border-secondary h-10 px-5 py-2">
                      <span className="text-xs font-semibold text-quaternary">Name</span>
                    </div>
                    <div className="w-[266px] shrink-0 bg-secondary border-b border-secondary h-10" />
                  </div>

                  {/* Sub-goal rows */}
                  {subGoals.map((sg, idx) => {
                    const progress = calcSubGoalProgress(sg)
                    const isLast = idx === subGoals.length - 1
                    return (
                      <div
                        key={sg.goal_id}
                        className="flex items-center bg-primary cursor-pointer hover:bg-primary_hover transition-colors"
                        onClick={() => {
                          router.push(
                            `/projects/${projectSlug}?tab=overview&goal=${goalId}&subgoal=${sg.goal_id}`,
                            { scroll: false }
                          )
                        }}
                      >
                        <SubGoalCellText className={isLast ? 'border-b-0' : undefined}>{sg.title}</SubGoalCellText>
                        <SubGoalCellProgress value={progress} className={isLast ? 'border-b-0' : undefined} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column — Properties panel */}
        <aside>
          <GoalPropertiesPanel
            goal={goal}
            epics={epics}
            projectSlug={projectSlug}
            onEpicChange={(epicId) => updateGoal({ epic_id: epicId })}
          />
        </aside>
      </div>
    </div>
  )
}
