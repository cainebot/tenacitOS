"use client"

import { type FC, type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { GoalBreadcrumb } from './goal-breadcrumb'
import { useGoals } from '@/hooks/use-goals'
import {
  ChevronRight,
  ChevronUpDouble,
  ChevronUp,
  ChevronDown,
  Minus,
  Plus,
  XClose,
  SearchLg,
  Tag01,
  Copy04,
  Expand06,
  DotsHorizontal,
  Calendar,
  Trash01,
  Columns03,
  ChevronDown as ChevronDownIcon,
  UploadCloud02,
  FaceSmile,
  SwitchVertical01,
  Send01,
  CheckSquare,
  Edit05,
  Lightning01,
  User01,
  Link01,
} from "@untitledui/icons"
import type { BadgeColor } from "@circos/ui"
import {
  Avatar,
  Badge,
  BadgeWithButton,
  BadgeWithDot,
  BadgeWithIcon,
  Button,
  ButtonUtility,
  CloseButton,
  Dropdown,
  ProgressBar,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Tooltip,
  TooltipTrigger,
  DatePickerCalendar,
  TextEditor,
  FileUpload,
  FeedItem,
  FeedItemText,
  FeedItemFile,
  FeedItemLink,
  cx,
} from "@circos/ui"
import { formatDistanceToNow, isYesterday, format } from "date-fns"
import { TaskTypeIndicator, type TaskType } from "./task-type-indicator"
import { TranscriptToolCard, TranscriptThinkingBlock } from "./run-transcript-view"
import { getLocalTimeZone, isToday, today } from "@internationalized/date"
import { I18nProvider } from "react-aria"
import type { DateValue, Key } from "react-aria-components"
import {
  DatePicker as AriaDatePicker,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Group as AriaGroup,
  Button as AriaButton,
  Popover as AriaPopover,
} from "react-aria-components"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffHours = diffMs / 3_600_000

  if (diffHours < 24) return formatDistanceToNow(date, { addSuffix: true })
  if (isYesterday(date)) return "Yesterday"
  return format(date, "MMM d, yyyy")
}

const reactionEmojis = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😄", label: "Laugh" },
  { emoji: "🎉", label: "Celebrate" },
  { emoji: "👀", label: "Eyes" },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Priority = "critical" | "high" | "medium" | "low"

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done" | "cancelled"

/** Lightweight shape for board columns passed into the panel */
export interface BoardColumnOption {
  columnId: string
  name: string
  stateIds: string[]
}

export interface TaskUser {
  id: string
  name: string
  avatarUrl?: string
  role?: string
}

export interface TaskTag {
  label: string
  color: BadgeColor
}

export interface Subtask {
  id: string
  code: string
  title: string
  taskType?: TaskType
  priority?: Priority | null
  assignee?: TaskUser | null
  status?: TaskStatus
  stateId?: string
}

export interface TaskComment {
  id: string
  author: TaskUser
  content: string
  createdAt: string
  isSystemEvent?: boolean
}

export type ActivityEventType =
  | "comment"
  | "created"
  | "state_change"
  | "assignment"
  | "priority_change"
  | "label_change"
  | "attachment_add"
  | "attachment_remove"
  | "due_date_change"
  | "field_update"
  // Agent execution events (Phase 89 — TASK-04)
  | "tool_use"
  | "tool_result"
  | "thinking"
  | "error"
  | "status"
  // Task lifecycle events (Phase 87)
  | "task_swept"
  | "agent_blocked"
  | "task_cancelled"

export interface ActivityEvent {
  id: string
  actor: TaskUser
  type: ActivityEventType
  createdAt: string
  /** Comment text (type=comment) */
  content?: string
  /** Previous value as display string */
  oldValue?: string
  /** New value as display string */
  newValue?: string
  /** Labels added/removed (type=label_change) */
  labels?: TaskTag[]
  /** File info (type=attachment_add) */
  attachment?: { name: string; size: string; fileType?: string }
  // Phase 89 — agent execution event fields
  /** Actor classification for filter (human/agent/system) */
  actorType?: 'human' | 'agent' | 'system'
  /** Tool name for tool_use/tool_result events */
  toolName?: string
  /** Tool arguments as JSON (tool_use) */
  toolInput?: Record<string, unknown>
  /** Tool result text (tool_result) */
  toolOutput?: string
  /** Tool execution duration in ms */
  durationMs?: number
}

export interface TaskAttachment {
  id: string
  name: string
  size: string
  createdAt: string
  thumbnailUrl?: string
}

export interface BreadcrumbItem {
  code: string
  title?: string
  taskType?: TaskType
  href?: string
}

export interface TaskDetailPanelProps {
  // Section A
  breadcrumbs?: BreadcrumbItem[]
  isCompleted?: boolean
  onToggleComplete?: () => void
  onCopyLink?: () => void
  onExpand?: () => void
  onClose?: () => void

  // Section B
  title: string
  onTitleChange?: (title: string) => void
  /** Fires on every keystroke for real-time sync (store only, no API) */
  onTitleInput?: (title: string) => void
  taskType?: TaskType
  status?: TaskStatus
  onStatusChange?: (status: TaskStatus) => void
  /** Board columns — when provided, the status dropdown shows column names instead of generic statuses */
  boardColumns?: BoardColumnOption[]
  /** Current state_id (used with boardColumns to highlight the active column) */
  stateId?: string
  /** Callback with state_id when user picks a column */
  onStateIdChange?: (stateId: string) => void

  // Section C
  description?: string
  onDescriptionChange?: (desc: string) => void

  // Section D - Metadata
  assignee?: TaskUser | null
  onAssigneeChange?: (user: TaskUser | null) => void
  users?: TaskUser[]
  dueDate?: DateValue | null
  onDueDateChange?: (date: DateValue | null) => void
  tags?: TaskTag[]
  availableTags?: TaskTag[]
  onTagsChange?: (tags: TaskTag[]) => void
  onTagCreate?: (tag: TaskTag) => void
  priority?: Priority | null
  onPriorityChange?: (priority: Priority | null) => void

  // Section E - Subtasks
  subtasks?: Subtask[]
  onAddSubtask?: (data: { title: string; priority?: Priority; assignee?: string; status?: TaskStatus; stateId?: string }) => void
  onSubtaskUpdate?: (subtaskId: string, updates: Partial<Pick<Subtask, 'title' | 'priority' | 'assignee' | 'status' | 'stateId'>>) => void
  onDeleteAllSubtasks?: () => void
  onSubtaskClick?: (subtask: Subtask) => void

  // Section F - Rich text body
  bodyContent?: string

  // Section G - Attachments
  attachments?: TaskAttachment[]
  onUploadAttachment?: () => void
  onFilesSelected?: (files: File[]) => void
  onDeleteAttachment?: (id: string) => void

  // Section H - Comments & Activity
  comments?: TaskComment[]
  onAddComment?: (content: string) => void
  activities?: ActivityEvent[]
  /** Phase 89 — agent execution events from task_messages Realtime */
  taskMessages?: ActivityEvent[]

  // Goal breadcrumb — D-05 cascade: card.goal_id (override) -> project.goal_id -> null
  /** The card's own goal_id (explicit override, takes precedence) */
  goalId?: string | null
  /** The project's goal_id (inherited when card has no explicit goal) */
  projectGoalId?: string | null

  className?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const highlightedDates = [today(getLocalTimeZone())]

const priorityConfig: Record<Priority, { label: string; color: BadgeColor; iconColor: string; icon: FC<{ className?: string }> }> = {
  critical: { label: "Critical", color: "error",   iconColor: "text-utility-error-500",   icon: ChevronUpDouble },
  high:     { label: "High",     color: "error",   iconColor: "text-utility-error-500",   icon: ChevronUp },
  medium:   { label: "Medium",   color: "warning", iconColor: "text-utility-warning-500", icon: Minus },
  low:      { label: "Low",      color: "blue",    iconColor: "text-utility-blue-500",    icon: ChevronDown },
}

const priorityKeys = Object.keys(priorityConfig) as Priority[]

const statusConfig: Record<TaskStatus, { label: string; color: BadgeColor }> = {
  todo:        { label: "To do",        color: "gray" },
  in_progress: { label: "In progress",  color: "success" },
  in_review:   { label: "In review",    color: "blue" },
  done:        { label: "Done",         color: "brand" },
  cancelled:   { label: "Cancelled",    color: "error" },
}

const statusKeys = Object.keys(statusConfig) as TaskStatus[]

const tagColorDot: Record<BadgeColor, string> = {
  gray: "bg-utility-gray-500",
  brand: "bg-utility-brand-500",
  error: "bg-utility-error-500",
  warning: "bg-utility-warning-500",
  success: "bg-utility-success-500",
  blue: "bg-utility-blue-500",
  "blue-light": "bg-utility-blue-light-500",
  indigo: "bg-utility-indigo-500",
  purple: "bg-utility-purple-500",
  pink: "bg-utility-pink-500",
  orange: "bg-utility-orange-500",
  "gray-blue": "bg-utility-gray-blue-500",
}

const tagColorOptions: BadgeColor[] = [
  "gray", "brand", "error", "warning", "success",
  "blue", "blue-light", "indigo", "purple", "pink", "orange", "gray-blue",
]

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TaskDetailPanel({
  breadcrumbs = [],
  isCompleted = false,
  onToggleComplete,
  onCopyLink,
  onExpand,
  onClose,
  title,
  onTitleChange,
  onTitleInput,
  taskType,
  status = "in_progress",
  onStatusChange,
  boardColumns,
  stateId,
  onStateIdChange,
  description,
  onDescriptionChange,
  assignee: assigneeProp,
  onAssigneeChange,
  users = [],
  dueDate: dueDateProp,
  onDueDateChange,
  tags = [],
  availableTags = [],
  onTagsChange,
  onTagCreate,
  priority: priorityProp,
  onPriorityChange,
  subtasks = [],
  onAddSubtask,
  onSubtaskUpdate,
  onDeleteAllSubtasks,
  onSubtaskClick,
  bodyContent,
  attachments = [],
  onUploadAttachment,
  onFilesSelected,
  onDeleteAttachment,
  comments = [],
  onAddComment,
  activities = [],
  taskMessages = [],
  goalId,
  projectGoalId,
  className,
}: TaskDetailPanelProps) {
  // Internal state for uncontrolled fields
  const [internalPriority, setInternalPriority] = useState<Priority | null>(null)
  const [internalDate, setInternalDate] = useState<DateValue | null>(null)
  const [internalAssignee, setInternalAssignee] = useState<TaskUser | null>(null)

  const priority = priorityProp !== undefined ? priorityProp : internalPriority
  const handlePriorityChange = (p: Priority | null) => { setInternalPriority(p); onPriorityChange?.(p) }

  const dueDate = dueDateProp !== undefined ? dueDateProp : internalDate
  const handleDateChange = (d: DateValue | null) => { setInternalDate(d); onDueDateChange?.(d) }

  const assignee = assigneeProp !== undefined ? assigneeProp : internalAssignee
  const handleAssigneeChange = (u: TaskUser | null) => { setInternalAssignee(u); onAssigneeChange?.(u) }

  // Close panel on Escape key
  useEffect(() => {
    if (!onClose) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const subtasksDone = subtasks.filter((s) => s.status === "done").length
  const subtasksProgress = subtasks.length > 0 ? Math.round((subtasksDone / subtasks.length) * 100) : 0

  // Goal breadcrumb resolution — D-05 cascade: card.goal_id (override) -> project.goal_id -> null
  const { goals } = useGoals()
  const resolvedGoalId = goalId ?? projectGoalId ?? null
  const isGoalOverride = goalId != null
  const resolvedGoal = useMemo(
    () => (resolvedGoalId ? goals.find((g) => g.goal_id === resolvedGoalId) ?? null : null),
    [goals, resolvedGoalId]
  )
  const parentGoal = useMemo(
    () =>
      resolvedGoal?.parent_id
        ? goals.find((g) => g.goal_id === resolvedGoal.parent_id) ?? null
        : null,
    [goals, resolvedGoal]
  )

  return (
    <div className={cx("flex h-full flex-col overflow-y-auto bg-primary", className)}>
      {/* ================================================================ */}
      {/* A · Top bar / Breadcrumb                                        */}
      {/* ================================================================ */}
      <SectionTopBar
        onCopyLink={onCopyLink}
        onExpand={onExpand}
        onClose={onClose}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-0 px-5">
          {/* ================================================================ */}
          {/* B · Breadcrumb + Title + Status                                  */}
          {/* ================================================================ */}
          <SectionTaskHeader
            breadcrumbs={breadcrumbs}
            onCopyLink={onCopyLink}
            title={title}
            onTitleChange={onTitleChange}
            onTitleInput={onTitleInput}
            status={status}
            onStatusChange={onStatusChange}
            boardColumns={boardColumns}
            stateId={stateId}
            onStateIdChange={onStateIdChange}
          />

          {/* ================================================================ */}
          {/* F · Description body (rich text)                                 */}
          {/* ================================================================ */}
          <SectionDescriptionBody bodyContent={bodyContent} onContentChange={onDescriptionChange} />

          <div className="h-px bg-border-secondary" />

          {/* ================================================================ */}
          {/* D · Details (metadata fields, collapsible)                       */}
          {/* ================================================================ */}
          <SectionDetails
            assignee={assignee}
            onAssigneeChange={handleAssigneeChange}
            users={users}
            dueDate={dueDate}
            onDueDateChange={handleDateChange}
            tags={tags}
            availableTags={availableTags}
            onTagsChange={onTagsChange}
            onTagCreate={onTagCreate}
            priority={priority}
            onPriorityChange={handlePriorityChange}
            resolvedGoal={resolvedGoal}
            parentGoal={parentGoal}
            isGoalOverride={isGoalOverride}
          />

          <div className="h-px bg-border-secondary" />

          {/* ================================================================ */}
          {/* E · Subtasks                                                     */}
          {/* ================================================================ */}
          {(subtasks.length > 0 || (onAddSubtask && taskType !== 'epic' && taskType !== 'subtask')) && (
            <>
              <SectionSubtasks
                subtasks={subtasks}
                subtasksDone={subtasksDone}
                subtasksProgress={subtasksProgress}
                onAddSubtask={onAddSubtask}
                onSubtaskUpdate={onSubtaskUpdate}
                onDeleteAllSubtasks={onDeleteAllSubtasks}
                onSubtaskClick={onSubtaskClick}
                taskType={taskType}
                users={users}
                boardColumns={boardColumns}
              />
              <div className="h-px bg-border-secondary" />
            </>
          )}

          {/* ================================================================ */}
          {/* G · Attachments                                                  */}
          {/* ================================================================ */}
          <SectionAttachments
            attachments={attachments}
            onUpload={onUploadAttachment}
            onFilesSelected={onFilesSelected}
            onDelete={onDeleteAttachment}
          />

          <div className="h-px bg-border-secondary" />

          {/* ================================================================ */}
          {/* H · Comments & Activity                                          */}
          {/* ================================================================ */}
          <SectionComments
            comments={comments}
            activities={activities}
            taskMessages={taskMessages}
            onAddComment={onAddComment}
          />
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// A · Top bar
// ===========================================================================

function SectionTopBar({
  onCopyLink,
  onExpand,
  onClose,
}: {
  onCopyLink?: () => void
  onExpand?: () => void
  onClose?: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-1 px-5 py-2">
      <ButtonUtility icon={Copy04} size="sm" color="tertiary" tooltip="Copy link" onClick={onCopyLink} />
      <ButtonUtility icon={Expand06} size="sm" color="tertiary" tooltip="Expand" onClick={onExpand} />

      <Dropdown.Root>
        <Dropdown.DotsButton className="size-7 p-1" />
        <Dropdown.Popover>
          <Dropdown.Menu>
            <Dropdown.Item label="Duplicate" />
            <Dropdown.Item label="Move" />
            <Dropdown.Item label="Archive" />
            <Dropdown.Separator />
            <Dropdown.Item label="Delete" className="text-error-primary" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>

      <CloseButton size="sm" onPress={onClose} />
    </div>
  )
}

// ===========================================================================
// B · Breadcrumb + Title + Status
// ===========================================================================

function SectionTaskHeader({
  breadcrumbs,
  onCopyLink,
  title,
  onTitleChange,
  onTitleInput,
  status = "in_progress",
  onStatusChange,
  boardColumns,
  stateId,
  onStateIdChange,
}: {
  breadcrumbs: BreadcrumbItem[]
  onCopyLink?: () => void
  title: string
  onTitleChange?: (title: string) => void
  onTitleInput?: (title: string) => void
  status?: TaskStatus
  onStatusChange?: (status: TaskStatus) => void
  boardColumns?: BoardColumnOption[]
  stateId?: string
  onStateIdChange?: (stateId: string) => void
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const isTitleFocusedRef = useRef(false)

  // Sync title prop → DOM via ref (avoids contentEditable + React reconciliation conflicts)
  useLayoutEffect(() => {
    if (titleRef.current && !isTitleFocusedRef.current) {
      if (titleRef.current.textContent !== title) {
        titleRef.current.textContent = title
      }
    }
  }, [title])
  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* Breadcrumb */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5" aria-label="Breadcrumb">
          {breadcrumbs.map((item, i) => {
            const isLast = i === breadcrumbs.length - 1
            const tooltipLabel = !isLast && item.title
              ? `${item.code}: ${item.title}`
              : undefined
            return (
              <span key={item.code} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span className="text-sm text-quaternary">/</span>
                )}
                {item.taskType && <TaskTypeIndicator type={item.taskType} size="sm" />}
                {isLast ? (
                  <span className="group/crumb flex items-center gap-1">
                    <span className="text-sm font-medium text-quaternary">{item.code}</span>
                    {onCopyLink && (
                      <Tooltip title="Copy link" placement="top" arrow>
                        <TooltipTrigger>
                          <button
                            type="button"
                            onClick={onCopyLink}
                            className="flex items-center justify-center text-quaternary opacity-0 transition-opacity group-hover/crumb:opacity-100"
                          >
                            <Link01 className="size-3.5" />
                          </button>
                        </TooltipTrigger>
                      </Tooltip>
                    )}
                  </span>
                ) : tooltipLabel ? (
                  <Tooltip title={tooltipLabel} placement="top" arrow>
                    <TooltipTrigger>
                      <a
                        href={item.href ?? "#"}
                        className="text-sm font-medium text-tertiary transition-colors hover:text-brand-secondary hover:underline"
                      >
                        {item.code}
                      </a>
                    </TooltipTrigger>
                  </Tooltip>
                ) : (
                  <a
                    href={item.href ?? "#"}
                    className="text-sm font-medium text-tertiary transition-colors hover:text-brand-secondary hover:underline"
                  >
                    {item.code}
                  </a>
                )}
              </span>
            )
          })}
        </nav>
      )}

      {/* Title */}
      <h2
        ref={titleRef}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => { isTitleFocusedRef.current = true }}
        onBlur={(e) => {
          isTitleFocusedRef.current = false
          onTitleChange?.(e.currentTarget.textContent ?? "")
        }}
        onInput={(e) => onTitleInput?.((e.target as HTMLElement).textContent ?? "")}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.target as HTMLElement).blur() }
        }}
        className="text-display-xs font-semibold text-primary outline-none transition-colors hover:bg-secondary_hover focus:bg-transparent focus:ring-1 focus:ring-brand-500 rounded-sm px-1 -ml-1"
      />

      {/* Status select + Add subtask button */}
      <div className="flex items-center gap-2">
        {boardColumns && boardColumns.length > 0 ? (
          /* Dynamic board columns */
          <Dropdown.Root>
            <Button
              color="primary"
              size="sm"
              iconTrailing={ChevronDownIcon}
              slot="menu"
            >
              {boardColumns.find(c => c.stateIds.includes(stateId ?? ""))?.name ?? statusConfig[status].label}
            </Button>
            <Dropdown.Popover className="w-48">
              <Dropdown.Menu
                selectionMode="single"
                selectedKeys={new Set([boardColumns.find(c => c.stateIds.includes(stateId ?? ""))?.columnId ?? ""])}
                onSelectionChange={(keys) => {
                  const colId = [...keys][0] as string
                  const col = boardColumns.find(c => c.columnId === colId)
                  if (col?.stateIds[0]) onStateIdChange?.(col.stateIds[0])
                }}
              >
                {boardColumns.map((col) => (
                  <Dropdown.Item key={col.columnId} id={col.columnId} label={col.name} />
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        ) : (
          /* Fallback: hardcoded generic statuses */
          <Dropdown.Root>
            <Button
              color="primary"
              size="sm"
              iconTrailing={ChevronDownIcon}
              slot="menu"
            >
              {statusConfig[status].label}
            </Button>
            <Dropdown.Popover className="w-48">
              <Dropdown.Menu
                selectionMode="single"
                selectedKeys={new Set([status])}
                onSelectionChange={(keys) => {
                  const key = [...keys][0] as TaskStatus
                  if (key) onStatusChange?.(key)
                }}
              >
                {statusKeys.map((key) => (
                  <Dropdown.Item key={key} id={key} label={statusConfig[key].label} />
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        )}

      </div>
    </div>
  )
}

// ===========================================================================
// D · Metadata fields
// ===========================================================================

function SectionDetails({
  assignee,
  onAssigneeChange,
  users,
  dueDate,
  onDueDateChange,
  tags,
  availableTags,
  onTagsChange,
  onTagCreate,
  priority,
  onPriorityChange,
  resolvedGoal,
  parentGoal,
  isGoalOverride,
}: {
  assignee: TaskUser | null | undefined
  onAssigneeChange: (user: TaskUser | null) => void
  users: TaskUser[]
  dueDate: DateValue | null | undefined
  onDueDateChange: (date: DateValue | null) => void
  tags: TaskTag[]
  availableTags: TaskTag[]
  onTagsChange?: (tags: TaskTag[]) => void
  onTagCreate?: (tag: TaskTag) => void
  priority: Priority | null | undefined
  onPriorityChange: (priority: Priority | null) => void
  resolvedGoal: import('@/types/project').GoalRow | null
  parentGoal?: import('@/types/project').GoalRow | null
  isGoalOverride: boolean
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="py-4">
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ChevronDownIcon
          className={cx(
            "size-4 text-fg-quaternary transition-transform duration-200",
            isCollapsed && "-rotate-90",
          )}
        />
        Details
      </button>

      {!isCollapsed && (
        <div className="mt-2">
      {/* D1 · Assignee */}
      <MetadataRow label="Assignee">
        <MetadataAssignee
          assignee={assignee ?? null}
          users={users}
          onSelect={onAssigneeChange}
        />
      </MetadataRow>

      {/* D2 · Due date */}
      <MetadataRow label="Due date">
        <MetadataDatePicker
          dueDate={dueDate ?? null}
          onDateChange={onDueDateChange}
        />
      </MetadataRow>

      {/* D3 · Tags */}
      <MetadataRow label="Tags">
        <MetadataTagPicker
          tags={tags}
          availableTags={availableTags}
          onTagsChange={onTagsChange}
          onTagCreate={onTagCreate}
        />
      </MetadataRow>

      {/* D4 · Priority */}
      <MetadataRow label="Priority" noBorder={!resolvedGoal}>
        <MetadataPriority
          priority={priority ?? null}
          onSelect={onPriorityChange}
        />
      </MetadataRow>

      {/* D5 · Goal — D-05 cascade (read-only) */}
      {resolvedGoal && (
        <MetadataRow label="Goal" noBorder>
          <GoalBreadcrumb
            resolvedGoal={resolvedGoal}
            parentGoal={parentGoal ?? null}
            contextSource=""
            isOverride={isGoalOverride}
          />
        </MetadataRow>
      )}
        </div>
      )}
    </div>
  )
}

function MetadataRow({ label, children, noBorder }: { label: string; children: ReactNode; noBorder?: boolean }) {
  return (
    <div className={cx("flex items-center py-2.5", !noBorder && "border-b border-secondary/50")}>
      <span className="w-28 shrink-0 text-xs font-medium text-tertiary">{label}</span>
      <div className="flex flex-1 items-center gap-2">{children}</div>
    </div>
  )
}

// D1 · Assignee selector
function MetadataAssignee({
  assignee,
  users,
  onSelect,
}: {
  assignee: TaskUser | null
  users: TaskUser[]
  onSelect: (user: TaskUser | null) => void
}) {
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = search
    ? users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
    : users

  return (
    <AriaDialogTrigger>
      <AriaButton aria-label="Select assignee" className="flex w-fit cursor-pointer items-center gap-2 rounded-md pl-1.5 pr-3 py-1 -ml-1.5 outline-none transition hover:bg-primary_hover">
        {assignee ? (
          <>
            <Avatar size="sm" src={assignee.avatarUrl} alt={assignee.name} />
            <span className="text-sm text-primary">{assignee.name}</span>
          </>
        ) : (
          <>
            <div className="flex size-6 items-center justify-center rounded-full bg-tertiary">
              <User01 className="size-3.5 text-fg-quaternary" />
            </div>
            <span className="text-sm text-quaternary">Unassigned</span>
          </>
        )}
      </AriaButton>
      <AriaPopover
        placement="bottom start"
        offset={4}
        onOpenChange={(isOpen) => {
          if (isOpen) { setSearch(""); setTimeout(() => inputRef.current?.focus(), 50) }
        }}
        className={({ isEntering, isExiting }) =>
          cx(
            "w-56 origin-(--trigger-anchor-point) overflow-hidden rounded-xl bg-primary shadow-lg ring-1 ring-secondary_alt will-change-transform",
            isEntering && "duration-150 ease-out animate-in fade-in slide-in-from-top-0.5",
            isExiting && "duration-100 ease-in animate-out fade-out slide-out-to-top-0.5",
          )
        }
      >
        <AriaDialog aria-label="Assignee picker" className="outline-none">
          {({ close }) => (
            <>
              <div className="flex items-center gap-2 border-b border-secondary px-3 py-2">
                <SearchLg className="size-4 shrink-0 text-fg-quaternary" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent text-sm text-primary placeholder:text-quaternary outline-none"
                />
              </div>
              <div className="max-h-48 overflow-y-auto py-1">
                {filtered.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => { onSelect(assignee?.id === user.id ? null : user); close() }}
                    className={cx(
                      "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-secondary transition hover:bg-primary_hover",
                      assignee?.id === user.id && "bg-primary_hover text-primary",
                    )}
                  >
                    <Avatar size="xs" src={user.avatarUrl} alt={user.name} />
                    <div className="flex flex-1 flex-col text-left">
                      <span className="truncate font-medium">{user.name}</span>
                      {user.role && <span className="truncate text-xs text-quaternary">{user.role}</span>}
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="px-3 py-2 text-sm text-quaternary">No results</p>
                )}
              </div>
              {assignee && (
                <div className="border-t border-secondary py-1">
                  <button
                    type="button"
                    onClick={() => { onSelect(null); close() }}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-secondary transition hover:bg-primary_hover"
                  >
                    <XClose className="size-4 shrink-0 stroke-[2.5px] text-fg-quaternary" />
                    <span className="font-medium">Unassign</span>
                  </button>
                </div>
              )}
            </>
          )}
        </AriaDialog>
      </AriaPopover>
    </AriaDialogTrigger>
  )
}

// D2 · Date picker
function MetadataDatePicker({
  dueDate,
  onDateChange,
}: {
  dueDate: DateValue | null
  onDateChange: (date: DateValue | null) => void
}) {
  const formatter = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" })
  const hasDate = dueDate != null
  const tz = getLocalTimeZone()
  const todayDate = today(tz)

  const formatDate = (date: DateValue) => {
    const diff = date.compare(todayDate)
    if (diff === -1) return "Yesterday"
    if (diff === 0) return "Today"
    if (diff === 1) return "Tomorrow"
    return formatter.format(date.toDate(tz))
  }

  const getDateColorClass = (date: DateValue | null): string => {
    if (!date) return "text-quaternary"
    const diff = date.compare(todayDate)
    if (diff < 0) return "text-error-400"       // overdue
    if (diff === 0) return "text-warning-300"    // today
    if (diff === 1) return "text-success-300"    // tomorrow
    return "text-primary"                        // 2+ days
  }

  return (
    <I18nProvider locale="en-US">
      <AriaDatePicker
        aria-label="Due date"
        shouldCloseOnSelect={false}
        value={dueDate}
        onChange={onDateChange}
      >
        <AriaGroup>
          <AriaButton className="flex w-fit cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg pl-2 pr-4 py-2 -ml-2 outline-none transition hover:bg-primary_hover">
            <Calendar className={cx("size-4 shrink-0", hasDate ? getDateColorClass(dueDate) : "text-fg-quaternary")} />
            <span className={cx("text-sm", hasDate ? getDateColorClass(dueDate) : "text-quaternary")}>
              {hasDate ? formatDate(dueDate) : "No due date"}
            </span>
          </AriaButton>
        </AriaGroup>
        <AriaPopover
          offset={8}
          placement="bottom start"
          className={({ isEntering, isExiting }) =>
            cx(
              "origin-(--trigger-anchor-point) will-change-transform",
              isEntering && "duration-150 ease-out animate-in fade-in slide-in-from-top-0.5",
              isExiting && "duration-100 ease-in animate-out fade-out slide-out-to-top-0.5",
            )
          }
        >
          <AriaDialog aria-label="Date picker" className="rounded-2xl bg-primary shadow-xl ring ring-secondary_alt">
            {({ close }) => (
              <>
                <div className="flex px-6 py-5">
                  <DatePickerCalendar highlightedDates={highlightedDates} />
                </div>
                {hasDate && (
                  <div className="border-t border-secondary px-4 py-3">
                    <button
                      type="button"
                      onClick={() => { onDateChange(null); close() }}
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
  )
}

// D3 · Tag picker
function MetadataTagPicker({
  tags,
  availableTags,
  onTagsChange,
  onTagCreate,
}: {
  tags: TaskTag[]
  availableTags: TaskTag[]
  onTagsChange?: (tags: TaskTag[]) => void
  onTagCreate?: (tag: TaskTag) => void
}) {
  const [search, setSearch] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [newTagColor, setNewTagColor] = useState<BadgeColor>("gray")
  const inputRef = useRef<HTMLInputElement>(null)
  const createInputRef = useRef<HTMLInputElement>(null)

  const selectedLabels = new Set(tags.map((t) => t.label))
  const filtered = search
    ? availableTags.filter((t) => t.label.toLowerCase().includes(search.toLowerCase()))
    : availableTags

  const toggleTag = (tag: TaskTag) => {
    if (selectedLabels.has(tag.label)) {
      onTagsChange?.(tags.filter((t) => t.label !== tag.label))
    } else {
      onTagsChange?.([...tags, tag])
    }
  }

  const handleCreate = () => {
    const name = createInputRef.current?.value.trim()
    if (!name) return
    const newTag: TaskTag = { label: name, color: newTagColor }
    onTagCreate?.(newTag)
    onTagsChange?.([...tags, newTag])
    setIsCreating(false)
    setSearch("")
  }

  const canCreate = search.length > 0 && !availableTags.some((t) => t.label.toLowerCase() === search.toLowerCase())

  return (
    <div className="flex flex-1 flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <BadgeWithButton
          key={tag.label}
          type="pill-color"
          color={tag.color}
          size="md"
          buttonLabel={`Remove ${tag.label}`}
          onButtonClick={() => onTagsChange?.(tags.filter((t) => t.label !== tag.label))}
        >
          {tag.label}
        </BadgeWithButton>
      ))}

      <AriaDialogTrigger>
        <AriaButton aria-label="Edit tags" className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs text-quaternary outline-none transition hover:bg-primary_hover hover:text-tertiary">
          {tags.length === 0 ? (
            <span className="text-sm text-quaternary">Add tag</span>
          ) : (
            <Tag01 className="size-3.5" />
          )}
        </AriaButton>
        <AriaPopover
          placement="bottom start"
          offset={4}
          onOpenChange={(isOpen) => {
            if (isOpen) { setSearch(""); setIsCreating(false); setTimeout(() => inputRef.current?.focus(), 50) }
          }}
          className={({ isEntering, isExiting }) =>
            cx(
              "w-56 origin-(--trigger-anchor-point) overflow-hidden rounded-xl bg-primary shadow-lg ring-1 ring-secondary_alt will-change-transform",
              isEntering && "duration-150 ease-out animate-in fade-in slide-in-from-top-0.5",
              isExiting && "duration-100 ease-in animate-out fade-out slide-out-to-top-0.5",
            )
          }
        >
          <AriaDialog aria-label="Tag picker" className="outline-none">
            {() => (
              <>
                <div className="flex items-center gap-2 border-b border-secondary px-3 py-2">
                  <SearchLg className="size-4 shrink-0 text-fg-quaternary" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tags..."
                    className="w-full bg-transparent text-sm text-primary placeholder:text-quaternary outline-none"
                  />
                </div>

                {!isCreating && (
                  <div className="max-h-48 overflow-y-auto py-1">
                    {filtered.map((tag) => (
                      <button
                        key={tag.label}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cx(
                          "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition hover:bg-primary_hover",
                          selectedLabels.has(tag.label) ? "bg-primary_hover text-primary font-medium" : "text-secondary",
                        )}
                      >
                        <span className={cx("size-2 shrink-0 rounded-full", tagColorDot[tag.color])} />
                        <span className="flex-1 truncate text-left">{tag.label}</span>
                        {selectedLabels.has(tag.label) && <XClose className="size-3.5 shrink-0 text-fg-quaternary" />}
                      </button>
                    ))}
                    {filtered.length === 0 && !canCreate && (
                      <p className="px-3 py-2 text-sm text-quaternary">No tags found</p>
                    )}
                  </div>
                )}

                {!isCreating && canCreate && (
                  <div className="border-t border-secondary py-1">
                    <button
                      type="button"
                      onClick={() => { setIsCreating(true); setNewTagColor("gray"); setTimeout(() => createInputRef.current?.focus(), 50) }}
                      className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm font-medium text-secondary transition hover:bg-primary_hover"
                    >
                      <Plus className="size-4 shrink-0 text-fg-quaternary" />
                      Create &ldquo;{search}&rdquo;
                    </button>
                  </div>
                )}

                {isCreating && (
                  <div className="border-t border-secondary px-3 py-3">
                    <input
                      ref={createInputRef}
                      type="text"
                      defaultValue={search}
                      placeholder="Tag name"
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setIsCreating(false) }}
                      className="w-full rounded-md bg-secondary px-2 py-1 text-sm text-primary placeholder:text-quaternary outline-none ring-1 ring-secondary focus:ring-brand-500"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tagColorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTagColor(color)}
                          className={cx(
                            "size-5 rounded-full transition",
                            tagColorDot[color],
                            newTagColor === color ? "ring-2 ring-brand-500 ring-offset-1 ring-offset-primary" : "hover:ring-1 hover:ring-secondary",
                          )}
                        />
                      ))}
                    </div>
                    <div className="mt-2.5 flex justify-end gap-2">
                      <button type="button" onClick={() => setIsCreating(false)} className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-secondary transition hover:bg-secondary_hover">Cancel</button>
                      <button type="button" onClick={handleCreate} className="cursor-pointer rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-brand-700">Create</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </AriaDialog>
        </AriaPopover>
      </AriaDialogTrigger>
    </div>
  )
}

// D4 · Priority selector
function MetadataPriority({
  priority,
  onSelect,
}: {
  priority: Priority | null
  onSelect: (p: Priority | null) => void
}) {
  const cfg = priority ? priorityConfig[priority] : null

  return (
    <AriaDialogTrigger>
      <AriaButton aria-label="Set priority" className="flex w-fit cursor-pointer items-center gap-2 rounded-md pl-1.5 pr-3 py-1 -ml-1.5 outline-none transition hover:bg-primary_hover">
        {cfg ? (
          <>
            <cfg.icon className={cx("size-4", cfg.iconColor)} />
            <span className="text-sm text-primary">{cfg.label}</span>
          </>
        ) : (
          <span className="text-sm text-quaternary">Set priority</span>
        )}
      </AriaButton>
      <AriaPopover
        placement="bottom start"
        offset={4}
        className={({ isEntering, isExiting }) =>
          cx(
            "w-44 origin-(--trigger-anchor-point) overflow-auto rounded-lg bg-primary shadow-lg ring-1 ring-secondary_alt will-change-transform",
            isEntering && "duration-150 ease-out animate-in fade-in slide-in-from-top-0.5",
            isExiting && "duration-100 ease-in animate-out fade-out slide-out-to-top-0.5",
          )
        }
      >
        <AriaDialog aria-label="Priority picker" className="outline-none">
          {({ close }) => (
            <div className="py-1">
              {priorityKeys.map((key) => {
                const pcfg = priorityConfig[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { onSelect(key === priority ? null : key); close() }}
                    className={cx(
                      "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-secondary transition hover:bg-primary_hover",
                      key === priority && "bg-primary_hover text-primary font-medium",
                    )}
                  >
                    <pcfg.icon className={cx("size-4", pcfg.iconColor)} />
                    {pcfg.label}
                  </button>
                )
              })}
              {priority && (
                <>
                  <div className="my-1 h-px bg-border-secondary" />
                  <button
                    type="button"
                    onClick={() => { onSelect(null); close() }}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-secondary transition hover:bg-primary_hover"
                  >
                    <XClose className="size-4 text-fg-quaternary" />
                    Clear
                  </button>
                </>
              )}
            </div>
          )}
        </AriaDialog>
      </AriaPopover>
    </AriaDialogTrigger>
  )
}

// ===========================================================================
// E · Subtasks
// ===========================================================================

function SectionSubtasks({
  subtasks,
  subtasksDone,
  subtasksProgress,
  onAddSubtask,
  onSubtaskUpdate,
  onDeleteAllSubtasks,
  onSubtaskClick,
  taskType,
  users = [],
  boardColumns,
}: {
  subtasks: Subtask[]
  subtasksDone: number
  subtasksProgress: number
  onAddSubtask?: (data: { title: string; priority?: Priority; assignee?: string; status?: TaskStatus; stateId?: string }) => void
  onSubtaskUpdate?: (subtaskId: string, updates: Partial<Pick<Subtask, 'title' | 'priority' | 'assignee' | 'status' | 'stateId'>>) => void
  onDeleteAllSubtasks?: () => void
  onSubtaskClick?: (subtask: Subtask) => void
  taskType?: TaskType
  users?: TaskUser[]
  boardColumns?: BoardColumnOption[]
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState("")
  const [creationDraft, setCreationDraft] = useState<{ priority?: Priority; assignee?: string; status?: TaskStatus; stateId?: string }>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const canAddSubtask = taskType !== 'epic' && taskType !== 'subtask'

  // Creation commit — called on Enter or blur-with-content (D-03, D-04)
  const handleCreationCommit = useCallback((titleValue: string) => {
    const val = titleValue.trim()
    if (val) {
      onAddSubtask?.({ title: val, ...creationDraft })
    }
    setIsAdding(false)
    setCreationDraft({})
  }, [onAddSubtask, creationDraft])

  // Title edit start (D-05)
  const handleTitleEditStart = useCallback((sub: Subtask) => {
    setEditingTitleId(sub.id)
    setTitleDraft(sub.title)
  }, [])

  // Title edit commit (D-05)
  const handleTitleEditCommit = useCallback((subtaskId: string, originalTitle: string) => {
    const val = titleDraft.trim()
    if (val && val !== originalTitle) {
      onSubtaskUpdate?.(subtaskId, { title: val })
    }
    setEditingTitleId(null)
  }, [titleDraft, onSubtaskUpdate])

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <ChevronDownIcon
            className={cx(
              "size-4 text-fg-quaternary transition-transform duration-200",
              isCollapsed && "-rotate-90",
            )}
          />
          Subtareas
        </button>
        <div className="flex items-center gap-1">
          <Dropdown.Root>
            <Dropdown.DotsButton className="size-6 p-0.5" />
            <Dropdown.Popover>
              <Dropdown.Menu>
                <Dropdown.Item label="Filter" />
                <Dropdown.Item label="Sort" />
                <Dropdown.Item label="View" />
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
          {canAddSubtask && onAddSubtask && (
            <ButtonUtility icon={Plus} size="xs" color="tertiary" tooltip="Add subtask" onClick={() => setIsAdding(true)} />
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Progress */}
          {subtasks.length > 0 && (
            <div className="mt-3">
              <ProgressBar
                value={subtasksProgress}
                labelPosition="right"
                valueFormatter={(_, pct) => `${pct.toFixed(0)} % completado`}
              />
            </div>
          )}

          {/* Bordered table — renders if there are subtasks OR if creating the first one (D-01, D-02) */}
          {(subtasks.length > 0 || isAdding) && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-secondary">
              <table className="w-full min-w-[600px] text-left">
                <thead>
                  <tr className="bg-quaternary">
                    <th className="border-b border-secondary px-3 py-2.5 text-xs font-medium text-tertiary">
                      Actividad
                    </th>
                    <th className="border-b border-l border-secondary px-3 py-2.5 text-xs font-medium text-tertiary">
                      Prioridad
                    </th>
                    <th className="border-b border-l border-secondary px-3 py-2.5 text-xs font-medium text-tertiary">
                      Persona asign...
                    </th>
                    <th className="border-b border-l border-secondary px-3 py-2.5 text-xs font-medium text-tertiary">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Existing subtask rows with inline editing (D-05, D-06, D-07, D-08, D-11) */}
                  {subtasks.map((sub, i) => {
                    const subPriority = sub.priority ? priorityConfig[sub.priority] : null
                    const subStatus = sub.status ? statusConfig[sub.status] : statusConfig.todo
                    const isLast = i === subtasks.length - 1 && !isAdding
                    const isEditing = editingTitleId === sub.id
                    return (
                      <tr
                        key={sub.id}
                        onClick={() => !isEditing && onSubtaskClick?.(sub)}
                        className={cx("transition", isEditing ? "bg-primary_hover" : "cursor-pointer hover:bg-primary_hover")}
                      >
                        {/* Title cell (D-05) */}
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className={cx("px-3 py-3", !isLast && "border-b border-secondary")}
                        >
                          {isEditing ? (
                            <input
                              ref={editInputRef}
                              autoFocus
                              value={titleDraft}
                              onChange={(e) => setTitleDraft(e.target.value)}
                              className="w-full bg-transparent text-sm text-primary outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleTitleEditCommit(sub.id, sub.title)
                                if (e.key === 'Escape') { e.stopPropagation(); setEditingTitleId(null) }
                              }}
                              onBlur={() => handleTitleEditCommit(sub.id, sub.title)}
                            />
                          ) : (
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              {sub.taskType && <TaskTypeIndicator type={sub.taskType} size="sm" />}
                              <span className="shrink-0 text-xs font-semibold text-tertiary">{sub.code}</span>
                              <span
                                onClick={(e) => { e.stopPropagation(); handleTitleEditStart(sub) }}
                                className="truncate cursor-pointer text-sm text-secondary hover:text-primary hover:underline"
                              >
                                {sub.title}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Priority cell — Dropdown picker (D-06, D-07, D-08, D-11) */}
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className={cx("border-l border-secondary px-3 py-3 cursor-pointer hover:bg-primary_hover", !isLast && "border-b")}
                        >
                          <Dropdown.Root>
                            <AriaButton
                              slot="menu"
                              className="flex items-center gap-1.5 rounded px-1 py-0.5 transition hover:bg-secondary_hover outline-none cursor-pointer"
                            >
                              {subPriority ? (
                                <>
                                  <subPriority.icon className={cx("size-4", subPriority.iconColor)} />
                                  <span className="text-sm text-secondary">{subPriority.label}</span>
                                </>
                              ) : (
                                <span className="text-sm text-quaternary">&mdash;</span>
                              )}
                            </AriaButton>
                            <Dropdown.Popover className="w-40">
                              <Dropdown.Menu
                                selectionMode="single"
                                selectedKeys={sub.priority ? new Set([sub.priority]) : new Set()}
                                onSelectionChange={(keys) => {
                                  const key = [...keys][0] as Priority
                                  onSubtaskUpdate?.(sub.id, { priority: key ?? null })
                                }}
                              >
                                {priorityKeys.map(key => (
                                  <Dropdown.Item key={key} id={key} label={priorityConfig[key].label} />
                                ))}
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown.Root>
                        </td>

                        {/* Assignee cell — AriaDialogTrigger picker (D-06, D-07, D-08, D-11) */}
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className={cx("border-l border-secondary px-3 py-3 cursor-pointer hover:bg-primary_hover", !isLast && "border-b")}
                        >
                          <SubtaskAssigneePicker
                            assignee={sub.assignee ?? null}
                            users={users}
                            onSelect={(user) => onSubtaskUpdate?.(sub.id, { assignee: user ?? undefined })}
                          />
                        </td>

                        {/* Status cell — Dropdown picker (D-06, D-07, D-08, D-11) */}
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className={cx("border-l border-secondary px-3 py-3 cursor-pointer hover:bg-primary_hover", !isLast && "border-b")}
                        >
                          {boardColumns && boardColumns.length > 0 ? (
                            <Dropdown.Root>
                              <AriaButton
                                slot="menu"
                                className="flex items-center cursor-pointer rounded px-1 py-0.5 transition hover:bg-secondary_hover outline-none"
                              >
                                <Badge type="modern" color={subStatus.color} size="sm">
                                  {boardColumns.find(c => c.stateIds.includes(sub.stateId ?? ""))?.name ?? subStatus.label}
                                </Badge>
                              </AriaButton>
                              <Dropdown.Popover className="w-48">
                                <Dropdown.Menu
                                  selectionMode="single"
                                  selectedKeys={new Set([boardColumns.find(c => c.stateIds.includes(sub.stateId ?? ""))?.columnId ?? ""])}
                                  onSelectionChange={(keys) => {
                                    const colId = [...keys][0] as string
                                    const col = boardColumns.find(c => c.columnId === colId)
                                    if (col?.stateIds[0]) onSubtaskUpdate?.(sub.id, { stateId: col.stateIds[0] })
                                  }}
                                >
                                  {boardColumns.map((col) => (
                                    <Dropdown.Item key={col.columnId} id={col.columnId} label={col.name} />
                                  ))}
                                </Dropdown.Menu>
                              </Dropdown.Popover>
                            </Dropdown.Root>
                          ) : (
                            <Dropdown.Root>
                              <AriaButton
                                slot="menu"
                                className="flex items-center cursor-pointer rounded px-1 py-0.5 transition hover:bg-secondary_hover outline-none"
                              >
                                <Badge type="modern" color={subStatus.color} size="sm">
                                  {subStatus.label}
                                </Badge>
                              </AriaButton>
                              <Dropdown.Popover className="w-48">
                                <Dropdown.Menu
                                  selectionMode="single"
                                  selectedKeys={new Set([sub.status ?? 'todo'])}
                                  onSelectionChange={(keys) => {
                                    const key = [...keys][0] as TaskStatus
                                    onSubtaskUpdate?.(sub.id, { status: key })
                                  }}
                                >
                                  {statusKeys.map(key => (
                                    <Dropdown.Item key={key} id={key} label={statusConfig[key].label} />
                                  ))}
                                </Dropdown.Menu>
                              </Dropdown.Popover>
                            </Dropdown.Root>
                          )}
                        </td>
                      </tr>
                    )
                  })}

                  {/* Creation row — appended at bottom of table (D-01, D-02, D-03, D-04) */}
                  {isAdding && (
                    <tr>
                      <td className={cx("px-3 py-2.5", subtasks.length > 0 && "border-t border-secondary")}>
                        <input
                          ref={inputRef}
                          autoFocus
                          placeholder="Subtask title..."
                          className="w-full bg-transparent text-sm text-primary placeholder:text-placeholder outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreationCommit(e.currentTarget.value)
                            if (e.key === 'Escape') { e.stopPropagation(); setIsAdding(false); setCreationDraft({}) }
                          }}
                          onBlur={(e) => {
                            // Pitfall 1: don't commit if focus moved to another element within the creation row
                            const row = e.currentTarget.closest('tr')
                            if (row && row.contains(e.relatedTarget as Node)) return
                            handleCreationCommit(e.target.value)
                          }}
                        />
                      </td>

                      {/* Creation row — Priority picker */}
                      <td onClick={(e) => e.stopPropagation()} className={cx("border-l border-secondary px-3 py-2.5", subtasks.length > 0 && "border-t")}>
                        <Dropdown.Root>
                          <AriaButton
                            slot="menu"
                            className="flex items-center gap-1.5 rounded px-1 py-0.5 transition hover:bg-secondary_hover outline-none cursor-pointer"
                          >
                            {creationDraft.priority ? (
                              <>
                                {(() => {
                                  const cfg = priorityConfig[creationDraft.priority]
                                  return (
                                    <>
                                      <cfg.icon className={cx("size-4", cfg.iconColor)} />
                                      <span className="text-sm text-secondary">{cfg.label}</span>
                                    </>
                                  )
                                })()}
                              </>
                            ) : (
                              <span className="text-sm text-quaternary">&mdash;</span>
                            )}
                          </AriaButton>
                          <Dropdown.Popover className="w-40">
                            <Dropdown.Menu
                              selectionMode="single"
                              selectedKeys={creationDraft.priority ? new Set([creationDraft.priority]) : new Set()}
                              onSelectionChange={(keys) => {
                                const key = [...keys][0] as Priority
                                setCreationDraft(prev => ({ ...prev, priority: key }))
                              }}
                            >
                              {priorityKeys.map(key => (
                                <Dropdown.Item key={key} id={key} label={priorityConfig[key].label} />
                              ))}
                            </Dropdown.Menu>
                          </Dropdown.Popover>
                        </Dropdown.Root>
                      </td>

                      {/* Creation row — Assignee picker */}
                      <td onClick={(e) => e.stopPropagation()} className={cx("border-l border-secondary px-3 py-2.5", subtasks.length > 0 && "border-t")}>
                        <SubtaskAssigneePicker
                          assignee={creationDraft.assignee ? (users.find(u => u.id === creationDraft.assignee) ?? null) : null}
                          users={users}
                          onSelect={(user) => setCreationDraft(prev => ({ ...prev, assignee: user?.id ?? undefined }))}
                        />
                      </td>

                      {/* Creation row — Status picker */}
                      <td onClick={(e) => e.stopPropagation()} className={cx("border-l border-secondary px-3 py-2.5", subtasks.length > 0 && "border-t")}>
                        {boardColumns && boardColumns.length > 0 ? (
                          <Dropdown.Root>
                            <AriaButton
                              slot="menu"
                              className="flex items-center cursor-pointer rounded px-1 py-0.5 transition hover:bg-secondary_hover outline-none"
                            >
                              <Badge type="modern" color="gray" size="sm">
                                {boardColumns.find(c => c.stateIds.includes(creationDraft.stateId ?? ""))?.name ?? boardColumns[0]?.name ?? "To do"}
                              </Badge>
                            </AriaButton>
                            <Dropdown.Popover className="w-48">
                              <Dropdown.Menu
                                selectionMode="single"
                                selectedKeys={new Set([boardColumns.find(c => c.stateIds.includes(creationDraft.stateId ?? ""))?.columnId ?? boardColumns[0]?.columnId ?? ""])}
                                onSelectionChange={(keys) => {
                                  const colId = [...keys][0] as string
                                  const col = boardColumns.find(c => c.columnId === colId)
                                  if (col?.stateIds[0]) setCreationDraft(prev => ({ ...prev, stateId: col.stateIds[0] }))
                                }}
                              >
                                {boardColumns.map((col) => (
                                  <Dropdown.Item key={col.columnId} id={col.columnId} label={col.name} />
                                ))}
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown.Root>
                        ) : (
                          <Dropdown.Root>
                            <AriaButton
                              slot="menu"
                              className="flex items-center cursor-pointer rounded px-1 py-0.5 transition hover:bg-secondary_hover outline-none"
                            >
                              {(() => {
                                const statusKey = creationDraft.status ?? 'todo'
                                const cfg = statusConfig[statusKey]
                                return (
                                  <Badge type="modern" color={cfg.color} size="sm">
                                    {cfg.label}
                                  </Badge>
                                )
                              })()}
                            </AriaButton>
                            <Dropdown.Popover className="w-48">
                              <Dropdown.Menu
                                selectionMode="single"
                                selectedKeys={new Set([creationDraft.status ?? 'todo'])}
                                onSelectionChange={(keys) => {
                                  const key = [...keys][0] as TaskStatus
                                  setCreationDraft(prev => ({ ...prev, status: key }))
                                }}
                              >
                                {statusKeys.map(key => (
                                  <Dropdown.Item key={key} id={key} label={statusConfig[key].label} />
                                ))}
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown.Root>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// E1 · Subtask assignee picker (inline, compact version of MetadataAssignee)
// ---------------------------------------------------------------------------

function SubtaskAssigneePicker({
  assignee,
  users,
  onSelect,
}: {
  assignee: TaskUser | null
  users: TaskUser[]
  onSelect: (user: TaskUser | null) => void
}) {
  const [search, setSearch] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  const filtered = search
    ? users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
    : users

  return (
    <AriaDialogTrigger>
      <AriaButton
        aria-label="Select assignee"
        className="flex w-fit cursor-pointer items-center gap-2 rounded px-1 py-0.5 transition hover:bg-secondary_hover outline-none"
      >
        {assignee ? (
          <>
            <Avatar size="xs" src={assignee.avatarUrl} alt={assignee.name} />
            <span className="truncate text-sm text-secondary">{assignee.name}</span>
          </>
        ) : (
          <>
            <div className="flex size-5 items-center justify-center rounded-full bg-tertiary">
              <User01 className="size-3 text-fg-quaternary" />
            </div>
            <span className="text-sm text-quaternary">Sin asignar</span>
          </>
        )}
      </AriaButton>
      <AriaPopover
        placement="bottom start"
        offset={4}
        onOpenChange={(isOpen) => {
          if (isOpen) { setSearch(""); setTimeout(() => searchInputRef.current?.focus(), 50) }
        }}
        className={({ isEntering, isExiting }) =>
          cx(
            "w-52 origin-(--trigger-anchor-point) overflow-hidden rounded-xl bg-primary shadow-lg ring-1 ring-secondary_alt will-change-transform",
            isEntering && "duration-150 ease-out animate-in fade-in slide-in-from-top-0.5",
            isExiting && "duration-100 ease-in animate-out fade-out slide-out-to-top-0.5",
          )
        }
      >
        <AriaDialog aria-label="Assignee picker" className="outline-none">
          {({ close }) => (
            <>
              <div className="flex items-center gap-2 border-b border-secondary px-3 py-2">
                <SearchLg className="size-4 shrink-0 text-fg-quaternary" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent text-sm text-primary placeholder:text-quaternary outline-none"
                />
              </div>
              <div className="max-h-40 overflow-y-auto py-1">
                {filtered.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => { onSelect(assignee?.id === user.id ? null : user); close() }}
                    className={cx(
                      "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-secondary transition hover:bg-primary_hover",
                      assignee?.id === user.id && "bg-primary_hover text-primary",
                    )}
                  >
                    <Avatar size="xs" src={user.avatarUrl} alt={user.name} />
                    <span className="truncate font-medium">{user.name}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="px-3 py-2 text-sm text-quaternary">No results</p>
                )}
              </div>
              {assignee && (
                <div className="border-t border-secondary py-1">
                  <button
                    type="button"
                    onClick={() => { onSelect(null); close() }}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-secondary transition hover:bg-primary_hover"
                  >
                    <XClose className="size-4 shrink-0 stroke-[2.5px] text-fg-quaternary" />
                    <span className="font-medium">Unassign</span>
                  </button>
                </div>
              )}
            </>
          )}
        </AriaDialog>
      </AriaPopover>
    </AriaDialogTrigger>
  )
}

// ===========================================================================
// F · Description body (rich text placeholder)
// ===========================================================================

function SectionDescriptionBody({ bodyContent, onContentChange }: { bodyContent?: string; onContentChange?: (html: string) => void }) {
  return (
    <div className="py-4">
      <span className="text-sm font-medium text-primary">Description</span>

      <div className="mt-2">
        <TextEditor
          content={bodyContent}
          onContentChange={onContentChange}
          maxCharacters={2000}
          hintText="{chars} characters left"
          placeholder="Start writing..."
        />
      </div>
    </div>
  )
}

// ===========================================================================
// G · Attachments
// ===========================================================================

function SectionAttachments({
  attachments,
  onUpload,
  onFilesSelected,
  onDelete,
}: {
  attachments: TaskAttachment[]
  onUpload?: () => void
  onFilesSelected?: (files: File[]) => void
  onDelete?: (id: string) => void
}) {
  const [showUploader, setShowUploader] = useState(false)

  return (
    <div className="py-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-primary">Attachments</span>
        <ButtonUtility
          icon={Plus}
          size="xs"
          color="tertiary"
          tooltip="Upload"
          onClick={() => {
            setShowUploader(!showUploader)
            onUpload?.()
          }}
        />
      </div>

      {/* File upload zone — shown when empty or toggled */}
      {showUploader && (
        <div className="mt-3">
          <FileUpload
            formatHint="SVG, PNG, JPG or GIF (max. 800x400px)"
            onFilesSelected={(files) => {
              onFilesSelected?.(files)
              setShowUploader(false)
            }}
          />
        </div>
      )}

      {/* Attachment cards */}
      {attachments.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group/att flex items-center gap-3 rounded-lg border border-secondary bg-secondary/30 px-3 py-2.5 transition hover:border-primary"
            >
              <div className="flex size-8 items-center justify-center rounded-(--radius-md) border border-primary shadow-xs-skeumorphic text-xs font-medium text-quaternary">
                {att.name.split(".").pop()?.toUpperCase() ?? "FILE"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-secondary">{att.name}</p>
                <p className="text-xs text-quaternary">{att.size}</p>
              </div>
              <button
                type="button"
                onClick={() => onDelete?.(att.id)}
                className="opacity-0 transition group-hover/att:opacity-100"
              >
                <XClose className="size-4 text-fg-quaternary hover:text-fg-quaternary_hover" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// H · Comments & Activity
// ===========================================================================

// ---------------------------------------------------------------------------
// Activity event → FeedItem mapping
// ---------------------------------------------------------------------------

const fileTypeColorMap: Record<string, string> = {
  PDF: "bg-error-solid",
  DOC: "bg-brand-solid",
  DOCX: "bg-brand-solid",
  XLS: "bg-success-solid",
  XLSX: "bg-success-solid",
  PNG: "bg-warning-solid",
  JPG: "bg-warning-solid",
  ZIP: "bg-tertiary",
  RAR: "bg-tertiary",
}

function ActivityFeedEntry({
  event,
  connector,
}: {
  event: ActivityEvent
  connector: boolean
}) {
  switch (event.type) {
    case "comment":
      return (
        <div className="group/comment relative">
          <FeedItem
            avatarSrc={event.actor.avatarUrl}
            avatarAlt={event.actor.name}
            name={event.actor.name}
            timestamp={formatRelativeTime(event.createdAt)}
            connector={connector}
            size="sm"
          >
            <FeedItemText>{event.content}</FeedItemText>
          </FeedItem>
          <CommentReactionPicker />
        </div>
      )

    case "created":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          action="created this card"
          connector={connector}
          size="sm"
        />
      )

    case "state_change":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          action={
            <>
              moved from <FeedItemLink>{event.oldValue}</FeedItemLink> to{" "}
              <FeedItemLink>{event.newValue}</FeedItemLink>
            </>
          }
          connector={connector}
          size="sm"
        />
      )

    case "assignment":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          action={
            event.newValue ? (
              <>
                assigned <FeedItemLink>{event.newValue}</FeedItemLink>
              </>
            ) : (
              <>
                unassigned <FeedItemLink>{event.oldValue}</FeedItemLink>
              </>
            )
          }
          connector={connector}
          size="sm"
        />
      )

    case "priority_change":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          action={
            <>
              changed priority from <FeedItemLink>{event.oldValue}</FeedItemLink> to{" "}
              <FeedItemLink>{event.newValue}</FeedItemLink>
            </>
          }
          connector={connector}
          size="sm"
        />
      )

    case "label_change":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          action={event.oldValue ? "removed labels" : "added labels"}
          connector={connector}
          size="sm"
        >
          {event.labels && event.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.labels.map((tag) => (
                <Badge key={tag.label} color={tag.color} size="sm" type="modern">
                  {tag.label}
                </Badge>
              ))}
            </div>
          )}
        </FeedItem>
      )

    case "attachment_add":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          action="added a file"
          connector={connector}
          size="sm"
        >
          {event.attachment && (
            <FeedItemFile
              fileName={event.attachment.name}
              fileSize={event.attachment.size}
              fileType={event.attachment.fileType}
              fileTypeColor={fileTypeColorMap[event.attachment.fileType ?? ""] ?? "bg-tertiary"}
            />
          )}
        </FeedItem>
      )

    case "attachment_remove":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          action={
            <>
              removed file <FeedItemLink>{event.oldValue}</FeedItemLink>
            </>
          }
          connector={connector}
          size="sm"
        />
      )

    case "due_date_change":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          action={
            event.newValue ? (
              <>
                set due date to <FeedItemLink>{event.newValue}</FeedItemLink>
              </>
            ) : (
              "removed due date"
            )
          }
          connector={connector}
          size="sm"
        />
      )

    case "field_update":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          action={
            <>
              updated <FeedItemLink>{event.oldValue ?? "field"}</FeedItemLink>
              {event.newValue && (
                <>
                  {" "}to <FeedItemLink>{event.newValue}</FeedItemLink>
                </>
              )}
            </>
          }
          connector={connector}
          size="sm"
        />
      )

    case "tool_use":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          action={<>used tool <span className="font-semibold">{event.toolName ?? 'unknown'}</span></>}
          connector={connector}
          size="sm"
        >
          <TranscriptToolCard
            toolName={event.toolName ?? 'unknown'}
            input={event.toolInput}
            status="running"
            durationMs={event.durationMs}
          />
        </FeedItem>
      )

    case "tool_result":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          action={<>tool result: <span className="font-semibold">{event.toolName ?? 'tool'}</span></>}
          connector={connector}
          size="sm"
        >
          <TranscriptToolCard
            toolName={event.toolName ?? 'tool'}
            input={event.toolInput}
            output={event.toolOutput ?? event.content}
            status="completed"
            durationMs={event.durationMs}
          />
        </FeedItem>
      )

    case "error":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          action="encountered an error"
          connector={connector}
          size="sm"
        >
          <TranscriptToolCard
            toolName={event.toolName ?? 'error'}
            output={event.content ?? 'Unknown error'}
            status="error"
            isError
          />
        </FeedItem>
      )

    case "status":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          action={
            event.oldValue && event.newValue ? (
              <span className="inline-flex items-center gap-1">
                <BadgeWithDot color="gray" size="sm" type="pill-color">{event.oldValue}</BadgeWithDot>
                <span className="text-quaternary">-&gt;</span>
                <BadgeWithDot color="brand" size="sm" type="pill-color">{event.newValue}</BadgeWithDot>
              </span>
            ) : (
              <>{event.content ?? 'status changed'}</>
            )
          }
          connector={connector}
          size="sm"
        />
      )

    case "thinking":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          connector={connector}
          size="sm"
        >
          <TranscriptThinkingBlock content={event.content ?? ''} />
        </FeedItem>
      )

    case "task_swept":
    case "agent_blocked":
    case "task_cancelled":
      return (
        <FeedItem
          avatarSrc={event.actor.avatarUrl}
          avatarAlt={event.actor.name}
          name={event.actor.name}
          timestamp={formatRelativeTime(event.createdAt)}
          action={
            event.type === 'task_swept' ? 'task was swept (stuck)'
            : event.type === 'agent_blocked' ? 'agent is blocked'
            : 'task was cancelled'
          }
          connector={connector}
          size="sm"
        >
          {event.content && <FeedItemText>{event.content}</FeedItemText>}
        </FeedItem>
      )

    default:
      return null
  }
}

// ToolArgsBlock and ToolOutputBlock removed — replaced by TranscriptToolCard (Phase 89.1)

// ---------------------------------------------------------------------------
// Auto-collapse algorithm (D-05)
// Collapses 3+ consecutive same-actor same-type events into a summary row
// ---------------------------------------------------------------------------

type CollapsedGroup = {
  type: 'group'
  id: string
  actor: TaskUser
  messageType: ActivityEventType
  items: ActivityEvent[]
}

type TimelineEntry = ActivityEvent | CollapsedGroup

const COLLAPSIBLE_TYPES: ActivityEventType[] = ['tool_use', 'tool_result', 'thinking']
const COLLAPSE_THRESHOLD = 3

function collapseTimeline(events: ActivityEvent[]): TimelineEntry[] {
  const result: TimelineEntry[] = []
  let i = 0

  while (i < events.length) {
    const event = events[i]

    if (!COLLAPSIBLE_TYPES.includes(event.type)) {
      result.push(event)
      i++
      continue
    }

    // Count consecutive same-actor + same-type
    let j = i + 1
    while (
      j < events.length &&
      events[j].actor.id === event.actor.id &&
      events[j].type === event.type
    ) {
      j++
    }

    const runLength = j - i
    if (runLength >= COLLAPSE_THRESHOLD) {
      result.push({
        type: 'group',
        id: `group-${event.id}`,
        actor: event.actor,
        messageType: event.type,
        items: events.slice(i, j),
      })
    } else {
      result.push(...events.slice(i, j))
    }
    i = j
  }

  return result
}

// ---------------------------------------------------------------------------
// CollapsedGroupRow — avatar + count summary with click-to-expand (D-05)
// ---------------------------------------------------------------------------

function CollapsedGroupRow({
  group,
  isExpanded,
  onToggle,
}: {
  group: CollapsedGroup
  isExpanded: boolean
  onToggle: () => void
}) {
  const typeLabel = group.messageType === 'tool_use' ? 'tool calls'
    : group.messageType === 'tool_result' ? 'resultados'
    : group.messageType === 'thinking' ? 'pensamientos'
    : group.messageType

  return (
    <div>
      {isExpanded && group.items.map((item, idx) => (
        <ActivityFeedEntry
          key={item.id}
          event={item}
          connector={idx < group.items.length - 1}
        />
      ))}
      <Button
        type="button"
        color="link-gray"
        size="sm"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary transition hover:bg-secondary_hover"
      >
        <Avatar size="xs" alt={group.actor.name} />
        {isExpanded ? (
          <>
            <ChevronDown className="size-3.5 text-fg-tertiary" />
            <span>{group.actor.name}: {group.items.length} {typeLabel} (ocultar)</span>
          </>
        ) : (
          <>
            <ChevronRight className="size-3.5 text-fg-tertiary" />
            <span>{group.actor.name}: {group.items.length} {typeLabel} mas</span>
          </>
        )}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Merge comments + activities into unified timeline
// ---------------------------------------------------------------------------

function mergeTimeline(
  comments: TaskComment[],
  activities: ActivityEvent[],
  taskMessages: ActivityEvent[] = [],
): ActivityEvent[] {
  const commentEvents: ActivityEvent[] = comments
    .filter((c) => !c.isSystemEvent)
    .map((c) => ({
      id: c.id,
      actor: c.author,
      type: "comment" as const,
      createdAt: c.createdAt,
      content: c.content,
      actorType: (c.author.role ? 'agent' : 'human') as 'human' | 'agent' | 'system',
    }))

  const systemEvents: ActivityEvent[] = comments
    .filter((c) => c.isSystemEvent)
    .map((c) => ({
      id: c.id,
      actor: c.author,
      type: "field_update" as const,
      createdAt: c.createdAt,
      newValue: c.content,
      actorType: 'system' as const,
    }))

  return [...commentEvents, ...systemEvents, ...activities, ...taskMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

function SectionComments({
  comments,
  activities,
  taskMessages = [],
  onAddComment,
}: {
  comments: TaskComment[]
  activities: ActivityEvent[]
  taskMessages?: ActivityEvent[]
  onAddComment?: (content: string) => void
}) {
  const [commentText, setCommentText] = useState("")
  const [sortNewest, setSortNewest] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Set<'human' | 'agent' | 'system'>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const commentOnlyEvents = comments
    .filter((c) => !c.isSystemEvent)
    .map((c): ActivityEvent => ({
      id: c.id,
      actor: c.author,
      type: "comment",
      createdAt: c.createdAt,
      content: c.content,
      actorType: (c.author.role ? 'agent' : 'human') as 'human' | 'agent' | 'system',
    }))

  const allEvents = mergeTimeline(comments, activities, taskMessages)

  const sortedComments = sortNewest ? [...commentOnlyEvents].reverse() : commentOnlyEvents
  const sortedAll = sortNewest ? [...allEvents].reverse() : allEvents

  const filteredEvents = activeFilters.size === 0
    ? sortedAll
    : sortedAll.filter(e => e.actorType && activeFilters.has(e.actorType))

  const collapsedEntries = collapseTimeline(filteredEvents)

  function toggleFilter(filterType: 'human' | 'agent' | 'system') {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(filterType)) next.delete(filterType)
      else next.add(filterType)
      return next
    })
  }

  function resetFilters() {
    setActiveFilters(new Set())
  }

  function toggleGroupExpand(groupId: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const handleSubmit = () => {
    if (!commentText.trim()) return
    onAddComment?.(commentText.trim())
    setCommentText("")
  }

  return (
    <div className="py-4">
      <Tabs>
        <div className="flex items-center justify-between border-b border-secondary">
          <TabList size="sm" className="border-b-0">
            <Tab id="comments">Comments</Tab>
            <Tab id="activity">All activity</Tab>
          </TabList>
          <button
            type="button"
            onClick={() => setSortNewest(!sortNewest)}
            className="flex items-center gap-1 text-xs text-quaternary transition hover:text-tertiary"
          >
            <SwitchVertical01 className="size-3.5" />
            {sortNewest ? "Newest" : "Oldest"}
          </button>
        </div>

        <TabPanel id="comments">
          <div className="flex flex-col gap-4 pt-3">
            {sortedComments.map((event) => (
              <ActivityFeedEntry
                key={event.id}
                event={event}
                connector={false}
              />
            ))}
            {sortedComments.length === 0 && (
              <p className="py-4 text-center text-sm text-quaternary">No comments yet</p>
            )}
          </div>
        </TabPanel>

        <TabPanel id="activity">
          {/* Actor filter bar — D-06, D-07 */}
          <div className="flex items-center gap-2 pt-3 pb-2">
            <button
              type="button"
              onClick={resetFilters}
              className={cx(
                "inline-flex cursor-pointer select-none items-center rounded-full py-0.5 px-2 text-xs font-medium transition",
                activeFilters.size === 0
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
                  : "bg-secondary text-secondary hover:bg-secondary_hover",
              )}
            >
              Todo
            </button>
            {(['human', 'agent', 'system'] as const).map((filterType) => (
              <button
                key={filterType}
                type="button"
                onClick={() => toggleFilter(filterType)}
                className={cx(
                  "inline-flex cursor-pointer select-none items-center rounded-full py-0.5 px-2 text-xs font-medium transition",
                  activeFilters.has(filterType)
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
                    : "bg-secondary text-secondary hover:bg-secondary_hover",
                )}
              >
                {filterType === 'human' ? 'Humano' : filterType === 'agent' ? 'Agente' : 'Sistema'}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-0.5">
            {collapsedEntries.map((entry, i) => {
              if ((entry as CollapsedGroup).type === 'group') {
                const group = entry as CollapsedGroup
                return (
                  <CollapsedGroupRow
                    key={group.id}
                    group={group}
                    isExpanded={expandedGroups.has(group.id)}
                    onToggle={() => toggleGroupExpand(group.id)}
                  />
                )
              }
              return (
                <ActivityFeedEntry
                  key={(entry as ActivityEvent).id}
                  event={entry as ActivityEvent}
                  connector={i < collapsedEntries.length - 1}
                />
              )
            })}
            {collapsedEntries.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-secondary">Sin actividad aun</p>
                <p className="mt-1 text-xs text-tertiary">La actividad del equipo y los eventos del agente apareceran aqui.</p>
              </div>
            )}
          </div>
        </TabPanel>
      </Tabs>

      {/* Comment input */}
      <div className="mt-4 flex items-start gap-3">
        <Avatar size="sm" />
        <div className="flex flex-1 items-end gap-2 rounded-lg border border-secondary bg-secondary/30 px-3 py-2 transition focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
          <textarea
            value={commentText}
            onChange={(e) => {
              setCommentText(e.target.value)
              e.target.style.height = "auto"
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder="Add a comment..."
            rows={1}
            className="w-full max-h-32 resize-none overflow-y-auto bg-transparent text-sm leading-5 text-primary placeholder:text-quaternary outline-none [&::-webkit-resizer]:hidden"
            style={{ resize: "none" }}
          />
          {commentText.trim() && (
            <button
              type="button"
              onClick={handleSubmit}
              className="shrink-0 cursor-pointer text-brand-secondary transition hover:text-brand-tertiary"
            >
              <Send01 className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CommentReactionPicker() {
  return (
    <AriaDialogTrigger>
      <AriaButton
        aria-label="Add reaction"
        className="absolute right-0 top-1 cursor-pointer opacity-0 outline-none transition group-hover/comment:opacity-100"
      >
        <FaceSmile className="size-4 text-fg-quaternary hover:text-fg-quaternary_hover" />
      </AriaButton>
      <AriaPopover
        placement="bottom end"
        offset={4}
        className={({ isEntering, isExiting }) =>
          cx(
            "origin-(--trigger-anchor-point) will-change-transform",
            isEntering && "duration-150 ease-out animate-in fade-in slide-in-from-top-0.5",
            isExiting && "duration-100 ease-in animate-out fade-out slide-out-to-top-0.5",
          )
        }
      >
        <AriaDialog
          aria-label="Reaction picker"
          className="flex items-center gap-1 rounded-lg bg-primary px-2 py-1.5 shadow-lg ring-1 ring-secondary_alt outline-none"
        >
          {({ close }) => (
            <>
              {reactionEmojis.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  aria-label={r.label}
                  onClick={close}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-md text-base transition hover:bg-primary_hover"
                >
                  {r.emoji}
                </button>
              ))}
            </>
          )}
        </AriaDialog>
      </AriaPopover>
    </AriaDialogTrigger>
  )
}
