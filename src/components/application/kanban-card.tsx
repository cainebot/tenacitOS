"use client"

import { type FC, useRef, useState, useEffect, memo } from "react"
import { ChevronUpDouble, ChevronUp, ChevronDown, Minus, AlertCircle, Plus, MessageNotificationSquare, GitBranch01, Calendar, XClose, SearchLg, Tag01 } from "@untitledui/icons"
import type { BadgeColor } from "@circos/ui"
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
import { Avatar, Badge, BadgeWithIcon, ButtonUtility, Dropdown, DatePickerCalendar } from "@circos/ui"
import { cx } from "@circos/ui"

const highlightedDates = [today(getLocalTimeZone())]

export type Priority = "critical" | "high" | "medium" | "low"

const priorityConfig: Record<Priority, { label: string; color: BadgeColor; iconColor: string; iconCssClass: string; icon: FC<{ className?: string }> }> = {
  critical: { label: "Critical", color: "error",   iconColor: "text-utility-error-500",   iconCssClass: "!text-utility-error-500",   icon: ChevronUpDouble },
  high:     { label: "High",     color: "error",   iconColor: "text-utility-error-500",   iconCssClass: "!text-utility-error-500",   icon: ChevronUp },
  medium:   { label: "Medium",   color: "warning", iconColor: "text-utility-warning-500", iconCssClass: "!text-utility-warning-500", icon: Minus },
  low:      { label: "Low",      color: "blue",    iconColor: "text-utility-blue-500",    iconCssClass: "!text-utility-blue-500",    icon: ChevronDown },
}

const priorityKeys = Object.keys(priorityConfig) as Priority[]

export interface KanbanCardUser {
  id: string
  name: string
  avatarUrl?: string
}

export interface KanbanCardTag {
  label: string
  color: BadgeColor
}

export type KanbanCardSize = "sm" | "md"

export interface KanbanCardProps {
  title: string
  onTitleChange?: (title: string) => void
  size?: KanbanCardSize
  taskType?: TaskType
  tags?: KanbanCardTag[]
  availableTags?: KanbanCardTag[]
  onTagsChange?: (tags: KanbanCardTag[]) => void
  onTagCreate?: (tag: KanbanCardTag) => void
  commentsCount?: number
  priority?: Priority | null
  onPriorityChange?: (priority: Priority | null) => void
  subtasks?: { done: number; total: number }
  assignee?: KanbanCardUser | null
  onAssigneeChange?: (user: KanbanCardUser | null) => void
  users?: KanbanCardUser[]
  done?: boolean
  onDoneChange?: (done: boolean) => void
  dueDate?: DateValue | null
  onDueDateChange?: (date: DateValue | null) => void
  autoFocusTitle?: boolean
  onTitleCommit?: (title: string) => void
  onEscape?: () => void
  className?: string
}

const cardSizeClasses: Record<KanbanCardSize, string> = {
  sm: "w-[272px]",
  md: "w-[312px]",
}

const dateFormatter = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" })

function KanbanCardInner({
  title,
  onTitleChange,
  size = "sm",
  taskType,
  tags,
  availableTags = [],
  onTagsChange,
  onTagCreate,
  commentsCount,
  priority: priorityProp,
  onPriorityChange,
  subtasks,
  assignee: assigneeProp,
  onAssigneeChange,
  users = [],
  done = false,
  onDoneChange,
  dueDate: dueDateProp,
  onDueDateChange,
  autoFocusTitle,
  onTitleCommit,
  onEscape,
  className,
}: KanbanCardProps) {
  const titleRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (autoFocusTitle && titleRef.current) {
      const el = titleRef.current
      el.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [internalPriority, setInternalPriority] = useState<Priority | null>(null)
  const [internalDate, setInternalDate] = useState<DateValue | null>(null)
  const [internalAssignee, setInternalAssignee] = useState<KanbanCardUser | null>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false)

  const priority = priorityProp !== undefined ? priorityProp : internalPriority
  const handlePriorityChange = (newPriority: Priority | null) => {
    setInternalPriority(newPriority)
    onPriorityChange?.(newPriority)
  }

  const dueDate = dueDateProp !== undefined ? dueDateProp : internalDate
  const handleDateChange = (date: DateValue | null) => {
    setInternalDate(date)
    onDueDateChange?.(date)
  }

  const assignee = assigneeProp !== undefined ? assigneeProp : internalAssignee
  const handleAssigneeChange = (user: KanbanCardUser | null) => {
    setInternalAssignee(user)
    onAssigneeChange?.(user)
    setIsAssigneeOpen(false)
  }

  const hasDate = dueDate != null

  const formatDate = (date: DateValue) => {
    if (isToday(date, getLocalTimeZone())) return "Today"
    return dateFormatter.format(date.toDate(getLocalTimeZone()))
  }

  const priorityCfg = priority ? priorityConfig[priority] : null


  return (
    <div
      className={cx(
        "group/card flex flex-col gap-4 border border-secondary bg-primary_alt p-4 transition-colors hover:border-primary",
        size === "md" ? "rounded-2xl" : "rounded-xl",
        cardSizeClasses[size],
        done && "opacity-50",
        className,
      )}
    >
      {/* Row 1: Title + comments badge */}
      <div className="flex w-full items-start gap-1">
        {taskType && (
          <div className="mr-1 shrink-0">
            <TaskTypeIndicator type={taskType} size={size} />
          </div>
        )}
        <p
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onTitleChange?.(e.currentTarget.textContent ?? "")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              const text = (e.target as HTMLElement).textContent ?? ""
              ;(e.target as HTMLElement).blur()
              onTitleCommit?.(text)
            }
            if (e.key === "Escape") {
              e.preventDefault()
              onEscape?.()
            }
          }}
          className="min-h-px min-w-0 flex-1 rounded-sm bg-transparent px-1 -ml-1 text-md font-semibold leading-6 text-primary outline-none transition-colors hover:bg-secondary_hover focus:bg-transparent focus:ring-1 focus:ring-brand-500"
        >
          {title}
        </p>
        {commentsCount != null && (
          <BadgeWithIcon
            type="color"
            color="gray"
            size={size === "md" ? "md" : "sm"}
            iconLeading={MessageNotificationSquare}
            className="ring-0 group-hover/card:ring-1"
          >
            +{commentsCount}
          </BadgeWithIcon>
        )}
      </div>

      {/* Row 2: Tags */}
      <TagSelector
        tags={tags ?? []}
        availableTags={availableTags}
        onTagsChange={onTagsChange}
        onTagCreate={onTagCreate}
        size={size}
      />

      {/* Row 3: Actions */}
      <div className="flex w-full items-end justify-between">
        <div className="flex items-center gap-3">
          {/* Priority selector */}
          <PrioritySelector
            priority={priority}
            onSelect={handlePriorityChange}
            hasPriority={!!priorityCfg}
            size={size}
          />

          {subtasks && (
            <BadgeWithIcon
              type="color"
              color="gray"
              size={size === "md" ? "md" : "sm"}
              iconLeading={GitBranch01}
              className="ring-0 group-hover/card:ring-1"
            >
              {subtasks.done}/{subtasks.total}
            </BadgeWithIcon>
          )}
        </div>
        <div className="flex items-end gap-3">
          <I18nProvider locale="en-US">
          <AriaDatePicker
            aria-label="Due date"
            shouldCloseOnSelect={false}
            value={dueDate}
            onChange={handleDateChange}
            onOpenChange={setIsPickerOpen}
          >
            <AriaGroup>
              {hasDate ? (
                <AriaButton
                  className="size-max flex cursor-pointer items-center whitespace-nowrap rounded-sm ring-1 ring-inset shadow-xs bg-primary text-secondary ring-primary py-0.5 px-1.5 text-xs font-medium outline-none"
                >
                  {formatDate(dueDate)}
                </AriaButton>
              ) : (
                <ButtonUtility
                  icon={Calendar}
                  size="sm"
                  color="secondary"
                  tooltip="Set date"
                  className={cx(
                    "rounded-full",
                    !isPickerOpen && "hidden group-hover/card:inline-flex",
                  )}
                />
              )}
            </AriaGroup>
            <AriaPopover
              offset={8}
              placement="bottom end"
              className={({ isEntering, isExiting }) =>
                cx(
                  "origin-(--trigger-anchor-point) will-change-transform",
                  isEntering &&
                    "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-0.5",
                  isExiting &&
                    "duration-100 ease-in animate-out fade-out placement-bottom:slide-out-to-top-0.5",
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

          {/* Assignee avatar selector */}
          <AssigneeSelector
            users={users}
            assignee={assignee}
            onSelect={handleAssigneeChange}
          />
        </div>
      </div>
    </div>
  )
}

export const KanbanCard = memo(KanbanCardInner) as typeof KanbanCardInner

// ---------------------------------------------------------------------------
// Tag Selector (search, select, create tags)
// ---------------------------------------------------------------------------

const tagColorOptions: BadgeColor[] = [
  "gray", "brand", "error", "warning", "success",
  "blue", "blue-light", "indigo", "purple", "pink", "orange", "gray-blue",
]

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

function TagSelector({
  tags,
  availableTags,
  onTagsChange,
  onTagCreate,
  size = "sm",
}: {
  tags: KanbanCardTag[]
  availableTags: KanbanCardTag[]
  onTagsChange?: (tags: KanbanCardTag[]) => void
  onTagCreate?: (tag: KanbanCardTag) => void
  size?: KanbanCardSize
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

  const toggleTag = (tag: KanbanCardTag) => {
    if (selectedLabels.has(tag.label)) {
      onTagsChange?.(tags.filter((t) => t.label !== tag.label))
    } else {
      onTagsChange?.([...tags, tag])
    }
  }

  const handleCreate = () => {
    const name = createInputRef.current?.value.trim()
    if (!name) return
    const newTag: KanbanCardTag = { label: name, color: newTagColor }
    onTagCreate?.(newTag)
    onTagsChange?.([...tags, newTag])
    setIsCreating(false)
    setSearch("")
  }

  const hasResults = filtered.length > 0
  const canCreate = search.length > 0 && !availableTags.some((t) => t.label.toLowerCase() === search.toLowerCase())
  const hasTags = tags.length > 0
  const canEdit = !!onTagsChange

  // Nothing to show and no way to add
  if (!hasTags && !canEdit) return null

  return (
    <div className={cx(
      "flex w-full flex-wrap items-center gap-1.5",
      !hasTags && "hidden",
    )}>
      {tags.map((tag) => (
        <Badge
          key={tag.label}
          type="color"
          color={tag.color}
          size={size === "md" ? "md" : "sm"}
          className="ring-0"
        >
          {tag.label}
        </Badge>
      ))}

      <AriaDialogTrigger>
        <AriaButton
          aria-label="Add tag"
          className={cx(
            "inline-flex cursor-pointer items-center justify-center rounded-full text-fg-quaternary outline-none transition-opacity",
            tags.length > 0
              ? "size-5 opacity-0 group-hover/card:opacity-100"
              : "hidden",
          )}
        >
          <Tag01 className="size-4" />
        </AriaButton>
        <AriaPopover
          placement="bottom start"
          offset={4}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setSearch("")
              setIsCreating(false)
              setTimeout(() => inputRef.current?.focus(), 50)
            }
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
                {/* Search */}
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

                {/* Tag list */}
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
                        {selectedLabels.has(tag.label) && (
                          <XClose className="size-3.5 shrink-0 text-fg-quaternary" />
                        )}
                      </button>
                    ))}
                    {!hasResults && !canCreate && (
                      <p className="px-3 py-2 text-sm text-quaternary">No tags found</p>
                    )}
                  </div>
                )}

                {/* Create new tag */}
                {!isCreating && canCreate && (
                  <div className="border-t border-secondary py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(true)
                        setNewTagColor("gray")
                        setTimeout(() => createInputRef.current?.focus(), 50)
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm font-medium text-secondary transition hover:bg-primary_hover"
                    >
                      <Plus className="size-4 shrink-0 text-fg-quaternary" />
                      Create &ldquo;{search}&rdquo;
                    </button>
                  </div>
                )}

                {isCreating && (
                  <div className="border-t border-secondary px-3 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        ref={createInputRef}
                        type="text"
                        defaultValue={search}
                        placeholder="Tag name"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreate()
                          if (e.key === "Escape") setIsCreating(false)
                        }}
                        className="w-full rounded-md bg-secondary px-2 py-1 text-sm text-primary placeholder:text-quaternary outline-none ring-1 ring-secondary focus:ring-brand-500"
                      />
                    </div>
                    {/* Color picker */}
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
                      <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-secondary transition hover:bg-secondary_hover"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreate}
                        className="cursor-pointer rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-brand-700"
                      >
                        Create
                      </button>
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

// ---------------------------------------------------------------------------
// Priority Selector (popover with priority list)
// ---------------------------------------------------------------------------

function PrioritySelector({
  priority,
  onSelect,
  hasPriority,
  size = "sm",
}: {
  priority: Priority | null
  onSelect: (p: Priority | null) => void
  hasPriority: boolean
  size?: KanbanCardSize
}) {
  const [isOpen, setIsOpen] = useState(false)
  const cfg = priority ? priorityConfig[priority] : null
  const isMd = size === "md"

  // When open, always show the button regardless of hover
  const isVisible = hasPriority || isOpen

  return (
    <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <AriaButton
        className={cx(
          "size-max flex cursor-pointer items-center whitespace-nowrap rounded-sm ring-1 ring-inset shadow-xs py-0.5 pr-2 pl-1.5 font-medium outline-none",
          isMd ? "gap-1 text-sm" : "gap-0.5 text-xs",
          "bg-primary text-secondary ring-primary",
          !isVisible && "hidden group-hover/card:inline-flex",
        )}
      >
        {cfg ? (
          <>
            <cfg.icon className={cx("size-3 stroke-3", cfg.iconColor)} />
            {cfg.label}
          </>
        ) : (
          <>
            <Plus className="size-3 stroke-3 text-fg-quaternary" />
            Priority
          </>
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
              {priorityKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onSelect(key === priority ? null : key)
                    close()
                  }}
                  className={cx(
                    "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm font-semibold text-secondary transition hover:bg-primary_hover",
                    key === priority && "bg-primary_hover text-primary",
                  )}
                >
                  {priorityConfig[key].label}
                </button>
              ))}
            </div>
          )}
        </AriaDialog>
      </AriaPopover>
    </AriaDialogTrigger>
  )
}

// ---------------------------------------------------------------------------
// Assignee Selector (search + avatar list popover)
// ---------------------------------------------------------------------------

function AssigneeSelector({
  users,
  assignee,
  onSelect,
}: {
  users: KanbanCardUser[]
  assignee: KanbanCardUser | null
  onSelect: (user: KanbanCardUser | null) => void
}) {
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = search
    ? users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
    : users

  return (
    <AriaDialogTrigger>
      <AriaButton aria-label={assignee ? `Assigned to ${assignee.name}` : "Assign user"} className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full outline-none transition-shadow hover:ring-2 hover:ring-border-secondary focus-visible:ring-2 focus-visible:ring-border-secondary">
        <Avatar
          size="sm"
          src={assignee?.avatarUrl}
          alt={assignee?.name}
        />
      </AriaButton>
      <AriaPopover
        placement="bottom end"
        offset={4}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            setSearch("")
            setTimeout(() => inputRef.current?.focus(), 50)
          }
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
              {/* Search input */}
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
              {/* User list */}
              <div className="max-h-48 overflow-y-auto py-1">
                {filtered.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      onSelect(assignee?.id === user.id ? null : user)
                      close()
                    }}
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
              {/* Unassign */}
              {assignee && (
                <div className="border-t border-secondary py-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(null)
                      close()
                    }}
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
