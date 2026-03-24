"use client"

import { type FC, useRef, useState } from "react"
import { ArrowUp, ArrowDown, Minus, AlertCircle, CheckCircle, Plus, MessageNotificationSquare, GitBranch01, Calendar, XClose, SearchLg } from "@untitledui/icons"
import type { BadgeColor } from "@circos/ui"
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
import { Avatar, BadgeWithIcon, ButtonUtility, Dropdown, DatePickerCalendar } from "@circos/ui"
import { cx } from "@circos/ui"

const highlightedDates = [today(getLocalTimeZone())]

export type Priority = "critical" | "high" | "medium" | "low"

const priorityConfig: Record<Priority, { label: string; color: BadgeColor; iconColor: string; iconCssClass: string; icon: FC<{ className?: string }> }> = {
  critical: { label: "Critical", color: "error",   iconColor: "text-utility-error-500",   iconCssClass: "!text-utility-error-500",   icon: AlertCircle },
  high:     { label: "High",     color: "error",   iconColor: "text-utility-error-500",   iconCssClass: "!text-utility-error-500",   icon: ArrowUp },
  medium:   { label: "Medium",   color: "warning", iconColor: "text-utility-warning-500", iconCssClass: "!text-utility-warning-500", icon: Minus },
  low:      { label: "Low",      color: "blue",    iconColor: "text-utility-blue-500",    iconCssClass: "!text-utility-blue-500",    icon: ArrowDown },
}

const priorityKeys = Object.keys(priorityConfig) as Priority[]

export interface KanbanCardUser {
  id: string
  name: string
  avatarUrl?: string
}

export interface KanbanCardProps {
  title: string
  onTitleChange?: (title: string) => void
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
  className?: string
}

export function KanbanCard({
  title,
  onTitleChange,
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
  className,
}: KanbanCardProps) {
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

  const formatter = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" })
  const hasDate = dueDate != null

  const formatDate = (date: DateValue) => {
    if (isToday(date, getLocalTimeZone())) return "Today"
    return formatter.format(date.toDate(getLocalTimeZone()))
  }

  const priorityCfg = priority ? priorityConfig[priority] : null


  return (
    <div
      className={cx(
        "group/card flex w-[272px] flex-col gap-4 rounded-xl border border-secondary bg-primary_alt p-4 transition-colors hover:border-primary",
        done && "opacity-50",
        className,
      )}
    >
      {/* Row 1: Title + comments badge */}
      <div className={cx("flex w-full items-start", done ? "gap-2" : "gap-1")}>
        {done && (
          <button
            type="button"
            onClick={() => onDoneChange?.(!done)}
            className="mt-px shrink-0 cursor-pointer text-fg-success-secondary"
          >
            <CheckCircle className="size-5" />
          </button>
        )}
        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onTitleChange?.(e.currentTarget.textContent ?? "")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              ;(e.target as HTMLElement).blur()
            }
          }}
          className="min-h-px min-w-0 flex-1 rounded-sm bg-transparent px-1 -ml-1 text-sm font-semibold leading-5 text-primary outline-none transition-colors hover:bg-secondary_hover focus:bg-transparent focus:ring-1 focus:ring-brand-500"
        >
          {title}
        </p>
        {commentsCount != null && (
          <BadgeWithIcon
            type="color"
            color="gray"
            size="sm"
            iconLeading={MessageNotificationSquare}
            className="ring-0 group-hover/card:ring-1"
          >
            +{commentsCount}
          </BadgeWithIcon>
        )}
      </div>

      {/* Row 2: Actions */}
      <div className="flex w-full items-end justify-between">
        <div className="flex items-center gap-3">
          {/* Priority selector */}
          <PrioritySelector
            priority={priority}
            onSelect={handlePriorityChange}
            hasPriority={!!priorityCfg}
          />

          {subtasks && (
            <BadgeWithIcon
              type="color"
              color="gray"
              size="sm"
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
              <AriaDialog className="rounded-2xl bg-primary shadow-xl ring ring-secondary_alt">
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

// ---------------------------------------------------------------------------
// Priority Selector (popover with priority list)
// ---------------------------------------------------------------------------

function PrioritySelector({
  priority,
  onSelect,
  hasPriority,
}: {
  priority: Priority | null
  onSelect: (p: Priority | null) => void
  hasPriority: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const cfg = priority ? priorityConfig[priority] : null

  // When open, always show the button regardless of hover
  const isVisible = hasPriority || isOpen

  return (
    <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <AriaButton
        className={cx(
          "size-max flex cursor-pointer items-center whitespace-nowrap rounded-sm ring-1 ring-inset shadow-xs gap-0.5 py-0.5 pr-2 pl-1.5 text-xs font-medium outline-none",
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
        <AriaDialog className="outline-none">
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
      <AriaButton className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full outline-none transition-shadow hover:ring-2 hover:ring-border-secondary focus-visible:ring-2 focus-visible:ring-border-secondary">
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
        <AriaDialog className="outline-none">
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
