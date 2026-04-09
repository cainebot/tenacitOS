'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  useDraggable,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { SmartPointerSensor } from '@/lib/smart-pointer-sensor'
import type { ProjectStateRow, StateCategory } from '@/types/project'
import { StateListItem } from './state-list-item'
import { StateCreateInline } from './state-create-inline'
import { DeleteStateModal } from './delete-state-modal'
import { StateChip } from './state-chip'

interface StateListProps {
  states: ProjectStateRow[]
  columnStateMap: Record<string, string[]>
  onCreateState: (data: {
    name: string
    category: StateCategory
    color?: string
  }) => Promise<unknown>
  onUpdateState: (
    stateId: string,
    data: { name?: string; category?: StateCategory; color?: string },
  ) => Promise<ProjectStateRow | null>
  onDeleteState: (stateId: string, targetStateId?: string) => Promise<boolean>
}

/**
 * Internal wrapper: wires useDraggable to StateListItem.
 * Must be a separate component so useDraggable is called inside DndContext.
 */
function DraggableStateItem({
  state,
  states,
  columnStateMap,
  onUpdateState,
  onDeleteClick,
}: {
  state: ProjectStateRow
  states: ProjectStateRow[]
  columnStateMap: Record<string, string[]>
  onUpdateState: StateListProps['onUpdateState']
  onDeleteClick: (state: ProjectStateRow) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: state.state_id,
    data: { type: 'state', stateId: state.state_id, state },
  })

  return (
    <div ref={setNodeRef}>
      <StateListItem
        state={state}
        states={states}
        columnStateMap={columnStateMap}
        onUpdateState={onUpdateState}
        onDeleteClick={onDeleteClick}
        dragAttributes={attributes as unknown as Record<string, unknown>}
        dragListeners={listeners as unknown as Record<string, unknown> | undefined}
        isDragging={isDragging}
      />
    </div>
  )
}

/**
 * StateList — top-level state management sidebar component.
 *
 * Responsibilities:
 * - Owns the DndContext with SmartPointerSensor (distance: 5 activation)
 * - Renders DraggableStateItem for each state (with useDraggable)
 * - Shows DragOverlay with StateChip (BadgeWithDot) during drag
 * - Renders StateCreateInline at bottom for new state creation
 * - Orchestrates DeleteStateModal controlled by deleteTarget
 *
 * onDragEnd is a no-op in Phase 85 — drop targets are Phase 86's responsibility (per D-17).
 */
export function StateList({
  states,
  columnStateMap,
  onCreateState,
  onUpdateState,
  onDeleteState,
}: StateListProps) {
  // Tracks which state is being dragged — drives DragOverlay rendering
  const [activeState, setActiveState] = useState<ProjectStateRow | null>(null)

  // Tracks which state is targeted for deletion — drives DeleteStateModal open/close
  const [deleteTarget, setDeleteTarget] = useState<ProjectStateRow | null>(null)

  const sensors = useSensors(
    useSensor(SmartPointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current
    if (data?.type === 'state') {
      setActiveState(data.state as ProjectStateRow)
    }
  }

  function handleDragEnd(_event: DragEndEvent) {
    // No-op in Phase 85 — drop targets are Phase 86's responsibility (per D-17)
    setActiveState(null)
  }

  function handleDragCancel() {
    setActiveState(null)
  }

  const handleDeleteClick = useCallback((state: ProjectStateRow) => {
    setDeleteTarget(state)
  }, [])

  const handleDeleteClose = useCallback(() => {
    setDeleteTarget(null)
  }, [])

  return (
    <div className="flex flex-col">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-col gap-0.5">
          {states.map((state) => (
            <DraggableStateItem
              key={state.state_id}
              state={state}
              states={states}
              columnStateMap={columnStateMap}
              onUpdateState={onUpdateState}
              onDeleteClick={handleDeleteClick}
            />
          ))}
        </div>

        {/* DragOverlay: instant removal on drop (dropAnimation={null} per Phase 76 decision) */}
        <DragOverlay dropAnimation={null}>
          {activeState && <StateChip state={activeState} />}
        </DragOverlay>
      </DndContext>

      {/* Inline create form at bottom of list (per D-09) */}
      <div className="mt-2">
        <StateCreateInline onCreateState={onCreateState} />
      </div>

      {/* Delete modal — controlled by deleteTarget (per D-11, D-12) */}
      <DeleteStateModal
        state={deleteTarget}
        states={states}
        onDeleteState={onDeleteState}
        onClose={handleDeleteClose}
      />
    </div>
  )
}
