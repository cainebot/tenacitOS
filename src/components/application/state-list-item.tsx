'use client'

import { useState, useRef, useEffect, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { AlertTriangle, Palette, Trash01 } from '@untitledui/icons'
import { Badge, Dropdown, Input, Tooltip, TooltipTrigger, cx } from '@circos/ui'
import type { BadgeColor } from '@circos/ui'
import type { KeyboardEvent as AriaKeyboardEvent } from '@react-types/shared'
import { ColorSwatchPicker } from './color-swatch-picker'
import type { ProjectStateRow, StateCategory } from '@/types/project'

export interface StateListItemProps {
  state: ProjectStateRow
  /** All states for the project — needed for isLastOfCategory check */
  states: ProjectStateRow[]
  /** Column→state assignment map — needed for isUnassigned check */
  columnStateMap: Record<string, string[]>
  onUpdateState: (
    stateId: string,
    data: { name?: string; category?: StateCategory; color?: string },
  ) => Promise<ProjectStateRow | null>
  onDeleteClick: (state: ProjectStateRow) => void
  /** From useDraggable — passed by Plan 03's StateList wrapper */
  dragAttributes?: Record<string, unknown>
  /** From useDraggable — passed by Plan 03's StateList wrapper */
  dragListeners?: Record<string, unknown>
  /** From useDraggable */
  isDragging?: boolean
}

const CATEGORY_LABEL: Record<StateCategory, string> = {
  'to-do': 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

const CATEGORY_BADGE_COLOR: Record<StateCategory, BadgeColor> = {
  'to-do': 'gray',
  in_progress: 'blue',
  done: 'success',
}

export function StateListItem({
  state,
  states,
  columnStateMap,
  onUpdateState,
  onDeleteClick,
  dragAttributes,
  dragListeners,
  isDragging,
}: StateListItemProps) {
  // ---- Computed values ----
  const isLastOfCategory =
    states.filter((s) => s.category === state.category).length === 1

  const isUnassigned = !Object.values(columnStateMap).some((ids) =>
    ids.includes(state.state_id),
  )

  const categoryLabel = CATEGORY_LABEL[state.category]
  const categoryBadgeColor = CATEGORY_BADGE_COLOR[state.category]

  // ---- Inline rename state ----
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(state.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      // Focus is handled by autoFocus on the Input component
    }
  }, [isEditing])

  // Keep editValue in sync if state.name changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(state.name)
    }
  }, [state.name, isEditing])

  async function handleBlur() {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === state.name) {
      setIsEditing(false)
      return
    }
    const result = await onUpdateState(state.state_id, { name: trimmed })
    if (result) {
      setIsEditing(false)
    }
    // If result is null (update failed), keep edit mode open so user can retry
  }

  function handleKeyDown(e: AriaKeyboardEvent) {
    if (e.key === 'Enter') {
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setEditValue(state.name)
      setIsEditing(false)
    }
  }

  // ---- Color picker state ----
  const [showColorPicker, setShowColorPicker] = useState(false)

  function handleColorSelect(hex: string) {
    onUpdateState(state.state_id, { color: hex })
  }

  // ---- Context menu action handler ----
  function handleMenuAction(key: React.Key) {
    const action = key as string

    if (action === 'change-color') {
      setShowColorPicker(true)
      return
    }

    if (action === 'delete') {
      onDeleteClick(state)
      return
    }

    if (action.startsWith('category-')) {
      const newCategory = action.replace('category-', '') as StateCategory
      // Guard: cannot move the last state of a category
      const oldCategoryCount = states.filter(
        (s) => s.category === state.category,
      ).length
      if (oldCategoryCount <= 1) {
        // API will return 409 anyway; bail out early
        return
      }
      onUpdateState(state.state_id, { category: newCategory })
    }
  }

  return (
    <div
      {...(dragAttributes as Record<string, unknown>)}
      {...(dragListeners as Record<string, unknown>)}
      className={cx(
        'group relative flex items-center gap-2 rounded-md px-3 py-2 min-h-[40px] cursor-grab',
        'hover:bg-primary_hover',
        isDragging && 'opacity-40',
      )}
    >
      {/* Color dot — 16px circle */}
      <span
        className="size-4 shrink-0 rounded-full"
        style={{ backgroundColor: state.color }}
      />

      {/* Name — either display span or inline Input */}
      {isEditing ? (
        <Input
          ref={inputRef}
          size="sm"
          value={editValue}
          onChange={(value) => setEditValue(value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          aria-label="Rename state"
          className="flex-1 min-w-0"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className="flex-1 min-w-0 truncate text-sm text-primary cursor-text"
        >
          {state.name}
        </span>
      )}

      {/* Unassigned warning icon (SLIST-08) */}
      {isUnassigned && (
        <Tooltip title="Cards in this state are not visible on the board">
          <TooltipTrigger>
            <AlertTriangle className="size-4 text-warning-primary shrink-0" />
          </TooltipTrigger>
        </Tooltip>
      )}

      {/* Category badge */}
      <Badge color={categoryBadgeColor} type="pill-color" size="sm">
        {categoryLabel}
      </Badge>

      {/* Required badge (SLIST-07) */}
      {isLastOfCategory && (
        <Badge color="gray" type="pill-color" size="sm">
          Required
        </Badge>
      )}

      {/* Kebab menu — visible on group hover */}
      <div className={cx('shrink-0', 'opacity-0 group-hover:opacity-100 transition-opacity')}>
        <Dropdown.Root>
          <Dropdown.DotsButton />
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu onAction={handleMenuAction}>
              <Dropdown.Item id="change-color" label="Change color" icon={Palette} />
              <Dropdown.Separator />
              <Dropdown.Item
                id="category-to-do"
                label="To Do"
                isDisabled={state.category === 'to-do' || isLastOfCategory}
              />
              <Dropdown.Item
                id="category-in_progress"
                label="In Progress"
                isDisabled={state.category === 'in_progress' || isLastOfCategory}
              />
              <Dropdown.Item
                id="category-done"
                label="Done"
                isDisabled={state.category === 'done' || isLastOfCategory}
              />
              <Dropdown.Separator />
              <Dropdown.Item
                id="delete"
                label="Delete"
                icon={Trash01}
                isDisabled={isLastOfCategory}
              />
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>
      </div>

      {/* Color swatch picker — opens after dropdown closes (independent popover) */}
      {showColorPicker && (
        <ColorSwatchPicker
          currentColor={state.color}
          onColorSelect={handleColorSelect}
          isOpen={showColorPicker}
          onOpenChange={setShowColorPicker}
        />
      )}
    </div>
  )
}
