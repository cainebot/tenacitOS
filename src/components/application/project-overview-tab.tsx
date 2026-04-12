'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  DatePicker as AriaDatePicker,
  Group as AriaGroup,
  Button as AriaButton,
  Popover as AriaPopover,
  Dialog as AriaDialog,
} from 'react-aria-components'
import { I18nProvider } from 'react-aria'
import { parseDate, type DateValue } from '@internationalized/date'
import {
  TextEditor,
  Button,
  ButtonUtility,
  Select,
  AvatarGroup,
  ProgressBar,
  DatePickerCalendar,
  cx,
} from '@circos/ui'
import { Plus, ChevronRight, ChevronDown, Calendar, ArrowDown, CornerDownRight, Target04, DotsVertical, Users01, User01, XClose } from '@untitledui/icons'
import { AccordionOverview } from './accordion-overview'
import { GoalsInProgressCard } from './goals-in-progress-card'
import { PROJECT_COVER_ICONS, PROJECT_COVER_COLORS, type ProjectCoverColorId } from './project-cover/project-cover'
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
  projectCoverColor: ProjectCoverColorId | null
  description: string | null
  onDescriptionChange: (desc: string) => void
  deliveryDate: string | null
  onDeliveryDateChange: (date: string | null) => void
  agents: AgentRow[]
  projectLeadAgentId: string | null
  onProjectLeadChange: (agentId: string | null) => void
  members: ProjectMember[]
  onGoalNavigate: (goalId: string) => void
  onOpenMembersModal: () => void  // REQUIRED per D-10 — not optional
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

// TableCell variants per Figma design
function TableCellText({ children, isSubGoal, className }: { children: React.ReactNode; isSubGoal?: boolean; className?: string }) {
  return (
    <div className={cx("flex flex-1 items-center gap-3 border-b border-secondary h-[72px] px-6 py-4", className)}>
      {isSubGoal && <span className="text-sm font-medium text-primary shrink-0">↳</span>}
      <p className="flex-1 text-sm font-medium text-primary truncate">{children}</p>
    </div>
  )
}

function TableCellProgress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx("flex flex-1 items-center border-b border-secondary h-[72px] px-6 py-4", className)}>
      <ProgressBar value={value} labelPosition="right" />
    </div>
  )
}

function TableCellChevron({ direction, onClick, className }: { direction: 'down' | 'right'; onClick?: () => void; className?: string }) {
  return (
    <div
      className={cx("flex items-center border-b border-secondary h-[72px] px-6 py-4 w-[76px] shrink-0", className)}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick() } : undefined}
    >
      {onClick && (
        <ButtonUtility
          icon={direction === 'down' ? ChevronDown : ChevronRight}
          size="xs"
          color="tertiary"
        />
      )}
    </div>
  )
}

function GoalsTable({ goals, onGoalClick, onCreateGoal }: GoalsTableProps) {
  const rootGoals = useMemo(() => goals.filter((g) => !g.parent_id), [goals])

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

  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((goalId: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev)
      if (next.has(goalId)) next.delete(goalId)
      else next.add(goalId)
      return next
    })
  }, [])

  if (rootGoals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Target04 className="size-8 text-fg-quaternary mb-2" />
        <p className="text-sm text-tertiary">No goals defined yet</p>
        <Button
          size="sm"
          color="link-color"
          iconLeading={Plus}
          onClick={onCreateGoal}
          className="mt-2"
        >
          New Goal
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-4 overflow-clip rounded-2xl border border-primary bg-primary_alt">
      {/* Table header */}
      <div className="flex items-center">
        <div className="flex flex-1 items-center gap-1 bg-secondary border-b border-secondary h-10 px-5 py-2">
          <span className="text-xs font-semibold text-quaternary">Nombre</span>
          <ArrowDown className="size-3 text-fg-quaternary" />
        </div>
        <div className="flex-1 bg-secondary border-b border-secondary h-10" />
        <div className="w-[76px] shrink-0 bg-secondary border-b border-secondary h-10" />
      </div>

      {/* Table rows */}
      {rootGoals.map((goal, idx) => {
        const children = subGoalsByParent.get(goal.goal_id) ?? []
        const hasChildren = children.length > 0
        const isExpanded = expandedGoals.has(goal.goal_id)
        const progress = calculateProgress(goal)
        const isLastRoot = idx === rootGoals.length - 1
        const isLastVisible = isLastRoot && (!hasChildren || !isExpanded)

        return (
          <div key={goal.goal_id}>
            {/* Parent row — bg-primary */}
            <div
              className="flex items-center cursor-pointer hover:bg-primary_hover transition-colors"
              onClick={() => hasChildren ? toggleExpand(goal.goal_id) : onGoalClick(goal.goal_id)}
            >
              <TableCellText className={isLastVisible ? 'border-b-0' : undefined}>{goal.title}</TableCellText>
              <TableCellProgress value={progress} className={isLastVisible ? 'border-b-0' : undefined} />
              <TableCellChevron
                direction={isExpanded ? 'down' : 'right'}
                className={isLastVisible ? 'border-b-0' : undefined}
                onClick={hasChildren ? () => toggleExpand(goal.goal_id) : undefined}
              />
            </div>

            {/* Sub-goal rows — bg-secondary */}
            {hasChildren && isExpanded && children.map((sub, subIdx) => {
              const subProgress = calculateProgress(sub)
              const isSubLast = isLastRoot && subIdx === children.length - 1
              return (
                <div
                  key={sub.goal_id}
                  className="flex items-center bg-secondary cursor-pointer hover:bg-secondary_hover transition-colors"
                  onClick={() => onGoalClick(sub.goal_id)}
                >
                  <TableCellText isSubGoal className={cx("pl-8", isSubLast ? 'border-b-0' : undefined)}>{sub.title}</TableCellText>
                  <TableCellProgress value={subProgress} className={isSubLast ? 'border-b-0' : undefined} />
                  <TableCellChevron direction="right" className={isSubLast ? 'border-b-0' : undefined} />
                </div>
              )
            })}
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

function MembersTable({ members: rawMembers, agents, onOpenModal }: MembersTableProps) {
  const members = rawMembers ?? []
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
  onDeliveryDateChange: (date: string | null) => void
  agents: AgentRow[]
  projectLeadAgentId: string | null
  onProjectLeadChange: (agentId: string | null) => void
  members: ProjectMember[]
  onOpenMembersModal: () => void
}

function MetadataRow({
  deliveryDate,
  onDeliveryDateChange,
  agents,
  projectLeadAgentId,
  onProjectLeadChange,
  members,
  onOpenMembersModal,
}: MetadataRowProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  // Parse delivery date to DateValue for react-aria DatePicker
  const dateValue = useMemo(() => {
    if (!deliveryDate) return null
    try {
      return parseDate(deliveryDate.slice(0, 10))
    } catch {
      return null
    }
  }, [deliveryDate])

  const handleDateChange = useCallback(
    (date: DateValue | null) => {
      onDeliveryDateChange(date ? date.toString() : null)
    },
    [onDeliveryDateChange],
  )

  // Format delivery date for display
  const formattedDate = deliveryDate
    ? new Date(deliveryDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  // Build agent items for select (icon for user-style rendering)
  const agentItems = useMemo(
    () => agents.map((a) => ({ id: a.agent_id, label: a.name ?? a.agent_id, icon: User01 })),
    [agents],
  )

  // Build avatar items from members
  const avatarItems = (members ?? []).slice(0, 5).map((m) => {
    const agent = agents.find((a) => a.agent_id === m.id)
    return {
      src: undefined as string | undefined,
      alt: agent?.name ?? m.name,
    }
  })

  return (
    <div className="flex items-start gap-4 py-6">
      {/* Project Lead — ghost Select */}
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <span className="text-sm font-medium text-secondary">Project lead</span>
        <Select
          aria-label="Project lead"
          placeholder="Unassigned"
          placeholderIcon={User01}
          size="md"
          selectedKey={projectLeadAgentId}
          onSelectionChange={(key) => onProjectLeadChange(key ? String(key) : null)}
          items={agentItems}
          className="[&_button]:bg-transparent [&_button]:shadow-none [&_button]:ring-0 [&_button]:hover:bg-primary_hover [&_button]:rounded-md [&_button_span]:px-1.5 [&_button_span]:py-2 [&_.ml-auto]:hidden"
        >
          {(item) => <Select.Item id={item.id} icon={item.icon}>{item.label}</Select.Item>}
        </Select>
      </div>

      {/* Delivery Date — ghost DatePicker */}
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <span className="text-sm font-medium text-secondary">Delivery Date</span>
        <I18nProvider locale="en-US">
          <AriaDatePicker
            aria-label="Delivery date"
            shouldCloseOnSelect
            value={dateValue}
            onChange={handleDateChange}
            onOpenChange={setIsPickerOpen}
          >
            <AriaGroup>
              <AriaButton
                className={cx(
                  "flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-2 text-md outline-none transition-colors hover:bg-primary_hover",
                  formattedDate ? "text-primary" : "text-placeholder",
                )}
              >
                <Calendar className="size-5 shrink-0 text-fg-quaternary" />
                <span className="truncate">{formattedDate ?? 'No date'}</span>
              </AriaButton>
            </AriaGroup>
            <AriaPopover
              offset={8}
              placement="bottom start"
              className={({ isEntering, isExiting }) =>
                cx(
                  "origin-(--trigger-anchor-point) will-change-transform",
                  isEntering && "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-0.5",
                  isExiting && "duration-100 ease-in animate-out fade-out placement-bottom:slide-out-to-top-0.5",
                )
              }
            >
              <AriaDialog aria-label="Date picker" className="rounded-2xl bg-primary shadow-xl ring ring-secondary_alt">
                {({ close }) => (
                  <>
                    <div className="flex px-6 py-5">
                      <DatePickerCalendar />
                    </div>
                    {formattedDate && (
                      <div className="border-t border-secondary px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            handleDateChange(null)
                            close()
                          }}
                          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-secondary transition hover:bg-primary_hover"
                        >
                          <XClose className="size-4 stroke-[2.5px]" />
                          Clear date
                        </button>
                      </div>
                    )}
                  </>
                )}
              </AriaDialog>
            </AriaPopover>
          </AriaDatePicker>
        </I18nProvider>
      </div>

      {/* Team members — avatar group */}
      <div className="flex flex-col gap-1 items-start shrink-0">
        <span className="text-sm font-medium text-secondary">Team members</span>
        {avatarItems.length > 0 ? (
          <button
            type="button"
            className="flex items-center gap-2 rounded-md py-1 transition-opacity hover:opacity-80"
            onClick={onOpenMembersModal}
            aria-label="Manage team members"
          >
            <AvatarGroup
              avatars={avatarItems}
              size="md"
              max={4}
            />
          </button>
        ) : (
          <Button
            size="sm"
            color="tertiary"
            iconLeading={Users01}
            onClick={onOpenMembersModal}
          >
            Add members
          </Button>
        )}
      </div>
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
  projectCoverColor,
  description,
  onDescriptionChange,
  deliveryDate,
  onDeliveryDateChange,
  agents,
  projectLeadAgentId,
  onProjectLeadChange,
  members,
  onGoalNavigate,
  onOpenMembersModal,
}: ProjectOverviewTabProps) {
  // ---------------------------------------------------------------------------
  // Goals
  // ---------------------------------------------------------------------------

  const { goals, createGoal } = useGoals(projectId)

  // ---------------------------------------------------------------------------
  // Description section — debounced auto-save
  // ---------------------------------------------------------------------------

  const descTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descAbortRef = useRef<AbortController | null>(null)

  const handleDescriptionChange = useCallback(
    (content: string) => {
      onDescriptionChange(content)
      if (descTimerRef.current) clearTimeout(descTimerRef.current)
      // Abort any in-flight save from a previous keystroke
      if (descAbortRef.current) descAbortRef.current.abort()
      descTimerRef.current = setTimeout(async () => {
        const controller = new AbortController()
        descAbortRef.current = controller
        try {
          const res = await fetch(`/api/projects/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: content }),
            signal: controller.signal,
          })
          if (!res.ok) throw new Error('Save failed')
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return
          toast.error('Failed to save description. Try again.')
        }
      }, 800)
    },
    [projectId, onDescriptionChange]
  )

  // Cleanup timer + abort in-flight fetch on unmount
  useEffect(() => {
    return () => {
      if (descTimerRef.current) clearTimeout(descTimerRef.current)
      if (descAbortRef.current) descAbortRef.current.abort()
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
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="grid grid-cols-[1fr_403px] gap-6">
      {/* ====================================================
          Left column — metadata + accordions
          ==================================================== */}
      <div className="min-w-0 space-y-0">
        {/* D-09: Duplicate title with 42x42 icon */}
        <div className="flex items-center gap-[9px] mb-6">
          {projectIcon && (() => {
            const IconComp = PROJECT_COVER_ICONS[projectIcon]
            const coverBg = PROJECT_COVER_COLORS.find((c) => c.id === (projectCoverColor ?? 'orange'))?.bg ?? '#ec8d5e'
            return (
              <div
                className="size-[42px] rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: coverBg }}
              >
                {IconComp ? <IconComp size={20} color="white" /> : null}
              </div>
            )
          })()}
          <h2 className="font-display text-display-xs font-semibold text-primary">{projectName}</h2>
        </div>

        {/* Metadata row: Project lead + Delivery Date + Team members */}
        <MetadataRow
          deliveryDate={deliveryDate}
          onDeliveryDateChange={onDeliveryDateChange}
          agents={agents}
          projectLeadAgentId={projectLeadAgentId}
          onProjectLeadChange={onProjectLeadChange}
          members={members}
          onOpenMembersModal={onOpenMembersModal}
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
              onPress={onOpenMembersModal}
            >
              Add member
            </Button>
          }
        >
          <MembersTable
            members={members}
            agents={agents}
            onOpenModal={onOpenMembersModal}
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

    </div>
  )
}
