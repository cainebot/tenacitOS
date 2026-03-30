import type { FC } from "react"
import {
  Lightning01,
  Lightbulb04,
  CheckDone01,
  Bookmark,
  AlertOctagon,
  SearchMd,
  CheckSquare,
} from "@untitledui/icons"
import { cx, Tooltip, TooltipTrigger } from "@circos/ui"

export type TaskType =
  | "epic"
  | "spike"
  | "subtask"
  | "story"
  | "bug"
  | "research"
  | "task"

export type TaskTypeIndicatorSize = "sm" | "md"

interface TaskTypeConfig {
  icon: FC<{ className?: string }>
  label: string
  bg: string
  fg: string
}

const taskTypeConfig: Record<TaskType, TaskTypeConfig> = {
  epic:     { icon: Lightning01,  label: "Epic",     bg: "bg-utility-purple-200",     fg: "text-utility-purple-500" },
  spike:    { icon: Lightbulb04,  label: "Spike",    bg: "bg-utility-warning-100",    fg: "text-utility-warning-500" },
  subtask:  { icon: CheckDone01,  label: "Subtask",  bg: "bg-utility-blue-light-100", fg: "text-utility-blue-light-500" },
  story:    { icon: Bookmark,     label: "Story",    bg: "bg-utility-success-100",    fg: "text-utility-success-500" },
  bug:      { icon: AlertOctagon, label: "Bug",      bg: "bg-utility-error-100",      fg: "text-utility-error-500" },
  research: { icon: SearchMd,     label: "Research", bg: "bg-utility-pink-100",       fg: "text-utility-pink-500" },
  task:     { icon: CheckSquare,  label: "Task",     bg: "bg-utility-blue-100",       fg: "text-utility-blue-500" },
}

const sizeClasses: Record<TaskTypeIndicatorSize, { container: string; icon: string }> = {
  sm: { container: "size-5 p-1",   icon: "size-3" },
  md: { container: "size-6 p-[5px]", icon: "size-3.5" },
}

export interface TaskTypeIndicatorProps {
  type: TaskType
  size?: TaskTypeIndicatorSize
  className?: string
}

export function TaskTypeIndicator({ type, size = "sm", className }: TaskTypeIndicatorProps) {
  const { icon: Icon, label, bg, fg } = taskTypeConfig[type]
  const s = sizeClasses[size]

  return (
    <Tooltip title={label} placement="top" arrow>
      <TooltipTrigger>
        <div
          className={cx(
            "flex items-center justify-center rounded-xs",
            s.container,
            bg,
            className,
          )}
        >
          <Icon className={cx("shrink-0", s.icon, fg)} />
        </div>
      </TooltipTrigger>
    </Tooltip>
  )
}
