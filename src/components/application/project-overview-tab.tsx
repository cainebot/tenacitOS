'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  TextEditor,
  Button,
  AvatarGroup,
  cx,
} from '@circos/ui'
import { Plus, ChevronRight, ChevronDown, CalendarPlus01, CornerDownRight, Target04, DotsVertical, Users01 } from '@untitledui/icons'
import { AccordionOverview } from './accordion-overview'
import { GoalsInProgressCard } from './goals-in-progress-card'
import { useGoals } from '@/hooks/use-goals'
import { toast } from 'sonner'
import type { AgentRow } from '@/types/supabase'
import type { GoalRow, ProjectMember } from '@/types/project'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectOverviewTabProps {
  projectId: string
  boardId: string
  projectSlug: string
  projectName: string
  projectIcon: string | null
  description: string | null
  onDescriptionChange: (desc: string) => void
  deliveryDate: string | null
  onDeliveryDateChange: (date: string | null) => void
  agents: AgentRow[]
  projectLeadAgentId: string | null
  members: ProjectMember[]
  onGoalNavigate: (goalId: string) => void
}

// ---------------------------------------------------------------------------
// Progress calculation (D-03)
// ---------------------------------------------------------------------------

function calculateProgress(goal: GoalRow): number {
  if (goal.goal_type === 'boolean') return goal.boolean_current === 'complete' ? 100 : 0
  if (
    goal.target_value !== null &&
    goal.initial_value !== null &&
    goal.current_value !== null &&
    goal.target_value !== goal.initial_value
  ) {
    return Math.max(
      0,
      Math.min(
        100,
        ((goal.current_value - goal.initial_value) / (goal.target_value - goal.initial_value)) * 100
      )
    )
  }
  return 0
}

// ---------------------------------------------------------------------------
// CharacterCounter (D-08/D-23)
// ---------------------------------------------------------------------------

function CharacterCounter({ charCount }: { charCount: number }) {
  const MAX_CHARS = 3000
  const WARNING_THRESHOLD = 100
  const charsLeft = MAX_CHARS - charCount

  return (
    <span
      className={cx(
        'text-xs mt-1 block',
        charsLeft < WARNING_THRESHOLD ? 'text-error-primary' : 'text-tertiary'
      )}
    >
      {charsLeft} characters left
    </span>
  )
}

// ---------------------------------------------------------------------------
// GoalsTable (D-04, D-06)
// ---------------------------------------------------------------------------

interface GoalsTableProps {
  goals: GoalRow[]
  onGoalClick: (goalId: string) => void
  onCreateGoal: () => void
}

function GoalsTable({ goals, onGoalClick, onCreateGoal }: GoalsTableProps) {
  // Only top-level goals (no parent)
  const rootGoals = useMemo(() => goals.filter((g) => !g.parent_id), [goals])

  // All sub-goals grouped by parent
  const subGoalsByParent = useMemo(() => {
    const map = new Map<string, GoalRow[]>()
    goals.forEach((g) => {
      if (g.parent_id) {
        const existing = map.get(g.parent_id) ?? []
        map.set(g.parent_id, [...existing, g])
      }
    })
    return map
  }, [goals])

  // Expand/collapse state — track expanded goal IDs in a Set (D-06)
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((goalId: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev)
      if (next.has(goalId)) {
        next.delete(goalId)
      } else {
        next.add(goalId)
      }
      return next
    })
  }, [])

  // Empty state
  if (rootGoals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Target04 className="size-8 text-fg-quaternary mb-2" />
        <p className="text-sm text-tertiary">No goals defined yet</p>
        <Button
          size="sm"
          color="link-color"
          iconLeading={Plus}
          onPress={onCreateGoal}
          className="mt-2"
        >
          New Goal
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-2">
      {rootGoals.map((goal) => {
        const children = subGoalsByParent.get(goal.goal_id) ?? []
        const hasChildren = children.length > 0
        const isExpanded = expandedGoals.has(goal.goal_id)
        const progress = calculateProgress(goal)

        return (
          <div key={goal.goal_id}>
            {/* Parent goal row */}
            <div
              className="flex items-center gap-3 py-2.5 px-2 rounded-md hover:bg-secondary cursor-pointer group"
              onClick={() => onGoalClick(goal.goal_id)}
            >
              {/* Chevron — only shown if has sub-goals (D-06) */}
              <button
                type="button"
                className={cx(
                  'shrink-0 text-fg-quaternary',
                  hasChildren ? 'visible' : 'invisible'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  if (hasChildren) toggleExpand(goal.goal_id)
                }}
                aria-label={isExpanded ? 'Collapse sub-goals' : 'Expand sub-goals'}
              >
                {isExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>

              {/* Goal title */}
              <span className="flex-1 text-sm text-secondary truncate">{goal.title}</span>

              {/* Progress bar + percentage */}
              <div className="flex items-center gap-2 shrink-0 min-w-[140px]">
                <div className="flex-1 h-1.5 rounded-full bg-tertiary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-fg-brand-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-tertiary w-8 text-right">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Sub-goal rows — indented, bg-secondary (D-04) */}
            {hasChildren && isExpanded && (
              <div>
                {children.map((sub) => {
                  const subProgress = calculateProgress(sub)
                  return (
                    <div
                      key={sub.goal_id}
                      className="flex items-center gap-3 py-2 px-2 rounded-md bg-secondary cursor-pointer hover:bg-secondary/80"
                      onClick={() => onGoalClick(sub.goal_id)}
                    >
                      {/* Spacer for chevron column alignment */}
                      <div className="size-4 shrink-0" />

                      {/* ↳ icon (D-04) */}
                      <CornerDownRight className="size-4 text-fg-quaternary shrink-0" />

                      {/* Sub-goal title — indented (pl-4xl = 32px via pl-8) */}
                      <span className="flex-1 text-sm text-secondary truncate pl-2">{sub.title}</span>

                      {/* Progress bar + percentage */}
                      <div className="flex items-center gap-2 shrink-0 min-w-[140px]">
                        <div className="flex-1 h-1.5 rounded-full bg-tertiary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-fg-brand-primary transition-all duration-300"
                            style={{ width: `${subProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-tertiary w-8 text-right">
                          {Math.round(subProgress)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MembersTable (D-22, D-25)
// ---------------------------------------------------------------------------

interface MembersTableProps {
  members: ProjectMember[]
  agents: AgentRow[]
  onOpenModal: () => void
}

function MembersTable({ members, agents, onOpenModal }: MembersTableProps) {
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <Users01 className="size-6 text-fg-quaternary mb-2" />
        <p className="text-sm text-tertiary">No team members yet</p>
        <Button
          size="sm"
          color="link-color"
          iconLeading={Plus}
          onPress={onOpenModal}
          className="mt-2"
        >
          Add member
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-2 divide-y divide-secondary">
      {members.map((member) => {
        const agent = agents.find((a) => a.agent_id === member.id)
        const displayName = agent?.name ?? member.name
        const roleLabel = agent?.role ?? member.type

        return (
          <div
            key={member.id}
            className="flex items-center gap-3 py-2.5 px-2 hover:bg-secondary rounded-md"
          >
            {/* Avatar */}
            <div className="size-8 rounded-full bg-tertiary flex items-center justify-center text-xs font-medium text-secondary shrink-0">
              {getInitials(displayName)}
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary truncate">{displayName}</p>
              <p className="text-xs text-tertiary truncate capitalize">{roleLabel}</p>
            </div>

            {/* Actions placeholder */}
            <button
              type="button"
              className="text-fg-quaternary hover:text-fg-secondary transition-colors"
              aria-label="Member options"
            >
              <DotsVertical className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MetadataRow
// ---------------------------------------------------------------------------

interface MetadataRowProps {
  deliveryDate: string | null
  agents: AgentRow[]
  projectLeadAgentId: string | null
  members: ProjectMember[]
  onOpenMembersModal: () => void
}

function MetadataRow({
  deliveryDate,
  agents,
  projectLeadAgentId,
  members,
  onOpenMembersModal,
}: MetadataRowProps) {
  const leadAgent = agents.find((a) => a.agent_id === projectLeadAgentId)

  // Format delivery date for display
  const formattedDate = deliveryDate
    ? new Date(deliveryDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  // Build avatar items from members
  const avatarItems = members.slice(0, 5).map((m) => {
    const agent = agents.find((a) => a.agent_id === m.id)
    return {
      src: undefined as string | undefined,
      alt: agent?.name ?? m.name,
    }
  })

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 py-3 border-b border-secondary">
      {/* Project Lead */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-tertiary shrink-0">Project Lead</span>
        {leadAgent ? (
          <div className="flex items-center gap-1.5">
            <div className="size-5 rounded-full bg-tertiary flex items-center justify-center text-xs font-medium text-secondary shrink-0">
              {leadAgent.name.slice(0, 1).toUpperCase()}
            </div>
            <span className="text-sm text-secondary truncate">{leadAgent.name}</span>
          </div>
        ) : (
          <span className="text-sm text-placeholder">No lead assigned</span>
        )}
      </div>

      <div className="w-px h-4 bg-border-secondary shrink-0" />

      {/* Delivery Date (D-01) */}
      <div className="flex items-center gap-2 min-w-0">
        <CalendarPlus01 className="size-4 text-fg-quaternary shrink-0" />
        <span className="text-xs text-tertiary shrink-0">Delivery Date</span>
        <span className="text-sm text-secondary">
          {formattedDate ?? (
            <span className="text-placeholder">No date</span>
          )}
        </span>
      </div>

      <div className="w-px h-4 bg-border-secondary shrink-0" />

      {/* Team members avatar group (D-10) */}
      {avatarItems.length > 0 ? (
        <button
          type="button"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          onClick={onOpenMembersModal}
          aria-label="Open team members"
        >
          <AvatarGroup
            avatars={avatarItems}
            size="xs"
            max={4}
          />
          {members.length > 4 && (
            <span className="text-xs text-tertiary">+{members.length - 4}</span>
          )}
        </button>
      ) : (
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-tertiary hover:text-secondary transition-colors"
          onClick={onOpenMembersModal}
        >
          <Users01 className="size-4" />
          <span>Add members</span>
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProjectOverviewTab
// ---------------------------------------------------------------------------

export function ProjectOverviewTab({
  projectId,
  boardId: _boardId,
  projectSlug: _projectSlug,
  projectName,
  projectIcon,
  description,
  onDescriptionChange,
  deliveryDate,
  onDeliveryDateChange: _onDeliveryDateChange,
  agents,
  projectLeadAgentId,
  members,
  onGoalNavigate,
}: ProjectOverviewTabProps) {
  // ---------------------------------------------------------------------------
  // Goals
  // ---------------------------------------------------------------------------

  const { goals, createGoal } = useGoals(projectId)

  // ---------------------------------------------------------------------------
  // Description section — debounced auto-save
  // ---------------------------------------------------------------------------

  const descTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDescriptionChange = useCallback(
    (content: string) => {
      onDescriptionChange(content)
      if (descTimerRef.current) clearTimeout(descTimerRef.current)
      descTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: content }),
          })
          if (!res.ok) throw new Error('Save failed')
        } catch {
          toast.error('Failed to save description. Try again.')
        }
      }, 800)
    },
    [projectId, onDescriptionChange]
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (descTimerRef.current) clearTimeout(descTimerRef.current)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Goal creation (D-18)
  // ---------------------------------------------------------------------------

  const handleCreateGoal = useCallback(async () => {
    const newGoal = await createGoal({
      title: 'Untitled Goal',
      level: 'department',
      project_id: projectId,
    })
    if (newGoal) {
      onGoalNavigate(newGoal.goal_id)
    }
  }, [createGoal, projectId, onGoalNavigate])

  // ---------------------------------------------------------------------------
  // Members modal state
  // ---------------------------------------------------------------------------

  const [showMembersModal, setShowMembersModal] = useState(false)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="grid grid-cols-[1fr_403px] gap-6">
      {/* ====================================================
          Left column — metadata + accordions
          ==================================================== */}
      <div className="min-w-0 space-y-0">
        {/* D-09: Duplicate title with 42x42 icon */}
        <div className="flex items-center gap-3 mb-6">
          {projectIcon && (
            <div className="size-[42px] rounded-lg bg-secondary flex items-center justify-center text-xl shrink-0">
              {projectIcon}
            </div>
          )}
          <h2 className="text-display-xs font-semibold text-primary">{projectName}</h2>
        </div>

        {/* Metadata row: Project lead + Delivery Date + Team members */}
        <MetadataRow
          deliveryDate={deliveryDate}
          agents={agents}
          projectLeadAgentId={projectLeadAgentId}
          members={members}
          onOpenMembersModal={() => setShowMembersModal(true)}
        />

        {/* Accordion 1: Description (D-07, D-08) */}
        <AccordionOverview
          title="Description"
          projectId={projectId}
          section="description"
        >
          <div className="pt-4">
            <TextEditor
              content={description ?? ''}
              onContentChange={handleDescriptionChange}
              placeholder="What is this project about?"
            />
            <CharacterCounter charCount={(description ?? '').length} />
          </div>
        </AccordionOverview>

        {/* Accordion 2: Goals (D-07) */}
        <AccordionOverview
          title="Project's Goals"
          projectId={projectId}
          section="goals"
          action={
            <Button
              size="sm"
              color="secondary"
              iconLeading={Plus}
              onPress={handleCreateGoal}
            >
              New Goal
            </Button>
          }
        >
          <GoalsTable
            goals={goals}
            onGoalClick={onGoalNavigate}
            onCreateGoal={handleCreateGoal}
          />
        </AccordionOverview>

        {/* Accordion 3: Team Members (D-07) */}
        <AccordionOverview
          title="Team Members"
          projectId={projectId}
          section="members"
          action={
            <Button
              size="sm"
              color="secondary"
              iconLeading={Plus}
              onPress={() => setShowMembersModal(true)}
            >
              Add member
            </Button>
          }
        >
          <MembersTable
            members={members}
            agents={agents}
            onOpenModal={() => setShowMembersModal(true)}
          />
        </AccordionOverview>
      </div>

      {/* ====================================================
          Right column — sticky sidebar (D-20)
          ==================================================== */}
      <aside className="relative">
        <div className="sticky top-4">
          <GoalsInProgressCard goals={goals} onGoalClick={onGoalNavigate} />
        </div>
      </aside>

      {/* Members modal placeholder — will be wired in Plan 06 */}
      {showMembersModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/70 backdrop-blur-sm"
          onClick={() => setShowMembersModal(false)}
        >
          <div
            className="bg-primary rounded-2xl shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-primary mb-4">Share with people</h2>
            <p className="text-sm text-tertiary mb-6">
              The following users have access to this project:
            </p>
            {members.map((m) => {
              const agent = agents.find((a) => a.agent_id === m.id)
              const displayName = agent?.name ?? m.name
              return (
                <div key={m.id} className="flex items-center gap-3 py-2">
                  <div className="size-10 rounded-full bg-tertiary flex items-center justify-center text-sm font-medium text-secondary shrink-0">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm text-primary">{displayName}</span>
                </div>
              )
            })}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-secondary">
              <Button
                size="sm"
                color="secondary"
                className="flex-1"
                onPress={() => setShowMembersModal(false)}
              >
                Copy link
              </Button>
              <Button
                size="sm"
                color="primary"
                className="flex-1"
                onPress={() => setShowMembersModal(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
