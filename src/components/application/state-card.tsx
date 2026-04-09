'use client'

import { Badge, Dropdown, cx } from '@circos/ui'
import type { BadgeColor } from '@circos/ui'
import { Trash01 } from '@untitledui/icons'
import type { ProjectStateRow, StateCategory } from '@/types/project'

const CATEGORY_BADGE_COLOR: Record<StateCategory, BadgeColor> = {
  'to-do': 'gray',
  in_progress: 'blue',
  done: 'success',
}

export interface StateCardProps {
  state: ProjectStateRow
  taskCount: number
  onDeleteClick?: (state: ProjectStateRow) => void
  /** Applied by DnD — reduced opacity while dragging */
  isDragging?: boolean
  /** Spread dnd-kit drag attributes */
  dragAttributes?: Record<string, unknown>
  /** Spread dnd-kit drag listeners */
  dragListeners?: Record<string, unknown>
  className?: string
}

export function StateCard({
  state,
  taskCount,
  onDeleteClick,
  isDragging,
  dragAttributes,
  dragListeners,
  className,
}: StateCardProps) {
  return (
    <div
      {...dragAttributes}
      {...dragListeners}
      className={cx(
        'flex flex-col gap-4 rounded-xl border border-secondary bg-primary_alt p-4 cursor-grab',
        isDragging && 'opacity-40',
        className,
      )}
    >
      {/* Top row: badge + kebab */}
      <div className="flex items-start justify-between">
        <Badge color={CATEGORY_BADGE_COLOR[state.category]} type="modern" size="md">
          {state.name}
        </Badge>

        {onDeleteClick && (
          <Dropdown.Root>
            <Dropdown.DotsButton />
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu onAction={(key) => {
                if (key === 'delete') onDeleteClick(state)
              }}>
                <Dropdown.Item
                  id="delete"
                  label="Delete"
                  icon={Trash01}
                  className="[&_svg]:!text-fg-error-primary [&_span]:!text-error-primary"
                />
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        )}
      </div>

      {/* Task count */}
      <p className="text-md font-normal text-primary">
        {taskCount} tareas asociadas
      </p>
    </div>
  )
}
