"use client"

import { type FC, type ReactNode, useRef, useState } from "react"
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
  cx,
} from "@circos/ui"
import { TaskTypeIndicator, type TaskType } from "./task-type-indicator"
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
// Types
// ---------------------------------------------------------------------------

export type Priority = "critical" | "high" | "medium" | "low"

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done" | "cancelled"

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
}

export interface TaskComment {
  id: string
  author: TaskUser
  content: string
  createdAt: string
  isSystemEvent?: boolean
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
  taskType?: TaskType
  status?: TaskStatus
  onStatusChange?: (status: TaskStatus) => void

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
  onAddSubtask?: () => void
  onDeleteAllSubtasks?: () => void
  onSubtaskClick?: (subtask: Subtask) => void

  // Section F - Rich text body
  bodyContent?: string

  // Section G - Attachments
  attachments?: TaskAttachment[]
  onUploadAttachment?: () => void
  onFilesSelected?: (files: File[]) => void
  onDeleteAttachment?: (id: string) => void

  // Section H - Comments
  comments?: TaskComment[]
  onAddComment?: (content: string) => void

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
  taskType,
  status = "in_progress",
  onStatusChange,
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
  onDeleteAllSubtasks,
  onSubtaskClick,
  bodyContent,
  attachments = [],
  onUploadAttachment,
  onFilesSelected,
  onDeleteAttachment,
  comments = [],
  onAddComment,
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

  const subtasksDone = subtasks.filter((s) => s.status === "done").length
  const subtasksProgress = subtasks.length > 0 ? Math.round((subtasksDone / subtasks.length) * 100) : 0

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
            title={title}
            onTitleChange={onTitleChange}
            status={status}
            onStatusChange={onStatusChange}
            onAddSubtask={onAddSubtask}
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
          />

          <div className="h-px bg-border-secondary" />

          {/* ================================================================ */}
          {/* E · Subtasks                                                     */}
          {/* ================================================================ */}
          {(subtasks.length > 0 || onAddSubtask) && (
            <>
              <SectionSubtasks
                subtasks={subtasks}
                subtasksDone={subtasksDone}
                subtasksProgress={subtasksProgress}
                onAddSubtask={onAddSubtask}
                onDeleteAllSubtasks={onDeleteAllSubtasks}
                onSubtaskClick={onSubtaskClick}
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
      <ButtonUtility icon={Copy04} size="xs" color="tertiary" tooltip="Copy link" onClick={onCopyLink} />
      <ButtonUtility icon={Expand06} size="xs" color="tertiary" tooltip="Expand" onClick={onExpand} />

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

      <CloseButton size="xs" onPress={onClose} />
    </div>
  )
}

// ===========================================================================
// B · Breadcrumb + Title + Status
// ===========================================================================

function SectionTaskHeader({
  breadcrumbs,
  title,
  onTitleChange,
  status = "in_progress",
  onStatusChange,
  onAddSubtask,
}: {
  breadcrumbs: BreadcrumbItem[]
  title: string
  onTitleChange?: (title: string) => void
  status?: TaskStatus
  onStatusChange?: (status: TaskStatus) => void
  onAddSubtask?: () => void
}) {
  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* Breadcrumb */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5" aria-label="Breadcrumb">
          {breadcrumbs.map((item, i) => (
            <span key={item.code} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-sm text-quaternary">/</span>
              )}
              {item.taskType && <TaskTypeIndicator type={item.taskType} size="sm" />}
              <a
                href={item.href ?? "#"}
                className="text-sm font-medium text-tertiary transition-colors hover:text-brand-secondary"
              >
                {item.code}
              </a>
            </span>
          ))}
        </nav>
      )}

      {/* Title */}
      <h2
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onTitleChange?.(e.currentTarget.textContent ?? "")}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.target as HTMLElement).blur() }
        }}
        className="text-display-xs font-semibold text-primary outline-none transition-colors hover:bg-secondary_hover focus:bg-transparent focus:ring-1 focus:ring-brand-500 rounded-sm px-1 -ml-1"
      >
        {title}
      </h2>

      {/* Status select + Add subtask button */}
      <div className="flex items-center gap-2">
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

        <ButtonUtility
          icon={Plus}
          size="sm"
          color="secondary"
          tooltip="Add subtask"
          onClick={onAddSubtask}
        />
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
      <MetadataRow label="Priority" noBorder>
        <MetadataPriority
          priority={priority ?? null}
          onSelect={onPriorityChange}
        />
      </MetadataRow>
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
            <Avatar size="xs" src={assignee.avatarUrl} alt={assignee.name} />
            <span className="text-sm text-primary">{assignee.name}</span>
          </>
        ) : (
          <>
            <div className="flex size-5 items-center justify-center rounded-full bg-tertiary">
              <User01 className="size-3 text-fg-quaternary" />
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
  onDeleteAllSubtasks,
  onSubtaskClick,
}: {
  subtasks: Subtask[]
  subtasksDone: number
  subtasksProgress: number
  onAddSubtask?: () => void
  onDeleteAllSubtasks?: () => void
  onSubtaskClick?: (subtask: Subtask) => void
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)

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
          <ButtonUtility icon={Plus} size="xs" color="tertiary" tooltip="Add subtask" onClick={onAddSubtask} />
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

          {/* Bordered table */}
          {subtasks.length > 0 && (
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
                  {subtasks.map((sub, i) => {
                    const subPriority = sub.priority ? priorityConfig[sub.priority] : null
                    const subStatus = sub.status ? statusConfig[sub.status] : statusConfig.todo
                    const isLast = i === subtasks.length - 1
                    return (
                      <tr
                        key={sub.id}
                        onClick={() => onSubtaskClick?.(sub)}
                        className="cursor-pointer transition hover:bg-primary_hover"
                      >
                        <td className={cx("px-3 py-3", !isLast && "border-b border-secondary")}>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            {sub.taskType && <TaskTypeIndicator type={sub.taskType} size="sm" />}
                            <span className="shrink-0 text-xs font-semibold text-tertiary">{sub.code}</span>
                            <span className="truncate text-sm text-secondary">{sub.title}</span>
                          </div>
                        </td>
                        <td className={cx("border-l border-secondary px-3 py-3", !isLast && "border-b")}>
                          {subPriority ? (
                            <div className="flex items-center gap-1.5">
                              <subPriority.icon className={cx("size-4", subPriority.iconColor)} />
                              <span className="text-sm text-secondary">{subPriority.label}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-quaternary">&mdash;</span>
                          )}
                        </td>
                        <td className={cx("border-l border-secondary px-3 py-3", !isLast && "border-b")}>
                          {sub.assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar size="xs" src={sub.assignee.avatarUrl} alt={sub.assignee.name} />
                              <span className="truncate text-sm text-secondary">{sub.assignee.name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex size-6 items-center justify-center rounded-full bg-tertiary">
                                <User01 className="size-3.5 text-fg-quaternary" />
                              </div>
                              <span className="text-sm text-quaternary">Sin asignar</span>
                            </div>
                          )}
                        </td>
                        <td className={cx("border-l border-secondary px-3 py-3", !isLast && "border-b")}>
                          <Badge type="modern" color="gray" size="sm">
                            {subStatus.label}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
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

function SectionComments({
  comments,
  onAddComment,
}: {
  comments: TaskComment[]
  onAddComment?: (content: string) => void
}) {
  const [commentText, setCommentText] = useState("")
  const [sortNewest, setSortNewest] = useState(false)

  const sorted = sortNewest ? [...comments].reverse() : comments

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
          <div className="flex flex-col">
            {sorted.filter((c) => !c.isSystemEvent).map((comment) => (
              <CommentRow key={comment.id} comment={comment} />
            ))}
            {comments.filter((c) => !c.isSystemEvent).length === 0 && (
              <p className="py-4 text-center text-sm text-quaternary">No comments yet</p>
            )}
          </div>
        </TabPanel>

        <TabPanel id="activity">
          <div className="flex flex-col">
            {sorted.map((comment) => (
              <CommentRow key={comment.id} comment={comment} />
            ))}
            {comments.length === 0 && (
              <p className="py-4 text-center text-sm text-quaternary">No activity yet</p>
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

const urlRegex = /(https?:\/\/[^\s]+)/g

function linkifyText(text: string) {
  const parts = text.split(urlRegex)
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-secondary underline decoration-brand-secondary/40 underline-offset-2 transition hover:decoration-brand-secondary"
      >
        {part}
      </a>
    ) : (
      part
    ),
  )
}

const reactionEmojis = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😄", label: "Laugh" },
  { emoji: "🎉", label: "Celebrate" },
  { emoji: "👀", label: "Eyes" },
]

function CommentRow({ comment }: { comment: TaskComment }) {
  return (
    <div className="group/comment flex gap-3 border-b border-secondary/50 py-3 last:border-b-0">
      <Avatar
        size="sm"
        src={comment.author.avatarUrl}
        alt={comment.author.name}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">{comment.author.name}</span>
            <span className="text-xs text-quaternary">{comment.createdAt}</span>
          </div>

          {/* Reaction picker */}
          <AriaDialogTrigger>
            <AriaButton aria-label="Add reaction" className="cursor-pointer opacity-0 outline-none transition group-hover/comment:opacity-100">
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
              <AriaDialog aria-label="Reaction picker" className="flex items-center gap-1 rounded-lg bg-primary px-2 py-1.5 shadow-lg ring-1 ring-secondary_alt outline-none">
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
        </div>
        <p className={cx(
          "mt-1 text-sm leading-relaxed",
          comment.isSystemEvent ? "text-quaternary italic" : "text-secondary",
        )}>
          {linkifyText(comment.content)}
        </p>
      </div>
    </div>
  )
}
