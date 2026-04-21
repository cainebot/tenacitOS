'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useSensor,
  useSensors,
  MeasuringStrategy,
  closestCenter,
  closestCorners,
} from '@dnd-kit/core'
import type {
  CollisionDetection,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  Modifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Input, Badge, Select, PageHeader, cx } from '@circos/ui'
import { ArrowNarrowLeft, HomeLine, Plus, Pencil01, Trash01 } from '@untitledui/icons'
import { SmartPointerSensor } from '@/lib/smart-pointer-sensor'
import { BoardSettingColumnHeader } from './board-setting-column-header'
import { StateCard } from './state-card'
import { StateCreateInline } from './state-create-inline'
import { DeleteStateModal } from './delete-state-modal'
import type { ProjectStateRow, StateCategory } from '@/types/project'
import type { ColumnWithStates } from '@/hooks/use-board-settings'

// ---------------------------------------------------------------------------
// Lock drag movement to X axis (columns only) — from kanban-board.tsx
// ---------------------------------------------------------------------------

const restrictToHorizontalAxis: Modifier = ({ transform }) => ({
  ...transform,
  y: 0,
})

// Re-measure droppable rects after every DOM change during drag —
// prevents stale cached rects from causing jumpless repositioning
// on second+ cross-column moves. (from kanban-board.tsx)
const measuringConfig = {
  droppable: { strategy: MeasuringStrategy.Always },
}

// Module-level drag flag — read by useStoreSyncRealtime to suppress patches during drag
let _boardSettingDragActive = false
export function isBoardSettingDragActive() { return _boardSettingDragActive }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoardSettingProps {
  columns: ColumnWithStates[]
  states: ProjectStateRow[]
  cardCounts: Record<string, number>
  projectName: string
  projectSlug: string
  onBack?: () => void
  onCreateState?: (data: { name: string; category: StateCategory; color?: string }) => Promise<unknown>
  onDeleteState?: (stateId: string, targetStateId?: string) => Promise<boolean>
  onColumnRename?: (columnId: string, name: string) => void
  onColumnDelete?: (columnId: string) => void
  onColumnAdd?: () => void
  onColumnsReorder?: (columnIds: string[]) => void
  assignState?: (columnId: string, stateId: string) => Promise<boolean>
  unassignState?: (columnId: string, stateId: string) => Promise<boolean>
}

// ---------------------------------------------------------------------------
// SortableColumnWrapper — adapted from kanban-board.tsx SortableColumnWrapper
// Passes drag handle props to children (grip icon only) instead of whole column
// ---------------------------------------------------------------------------

function SortableColumnWrapper({
  id,
  children,
}: {
  id: string
  children: (props: {
    dragHandleListeners: Record<string, unknown>
    dragHandleAttributes: Record<string, unknown>
  }) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: 'column' },
  })

  const style = { transform: CSS.Transform.toString(transform), transition }

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="flex w-[288px] shrink-0 flex-col gap-3.5">
        <div className="h-10 rounded-lg bg-tertiary" />
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className="shrink-0" data-board-column>
      {children({
        dragHandleListeners: listeners as unknown as Record<string, unknown>,
        dragHandleAttributes: attributes as unknown as Record<string, unknown>,
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SortableStateCard — wraps StateCard for drag in sidebar + columns
// Same pattern as SortableCard in kanban-column.tsx
// ---------------------------------------------------------------------------

function SortableStateCard({
  id,
  containerId,
  activeCardId,
  children,
}: {
  id: string
  containerId: string
  activeCardId?: string | null
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: 'state', stateId: id, containerId },
  })

  const isBeingDragged = isDragging || id === activeCardId

  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      suppressHydrationWarning
      className={isBeingDragged ? 'cursor-grabbing' : 'cursor-grab'}
    >
      {isBeingDragged ? (
        <div className="relative">
          <div className="invisible">{children}</div>
          <div className="absolute inset-0 rounded-xl bg-tertiary" />
        </div>
      ) : (
        children
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ColumnBody — droppable zone + sortable state cards within a column
// Same pattern as KanbanColumn's droppable zone
// ---------------------------------------------------------------------------

function ColumnBody({
  columnId,
  stateIds,
  states,
  cardCounts,
  onDeleteClick,
  isDragActive,
  activeId,
}: {
  columnId: string
  stateIds: string[]
  states: ProjectStateRow[]
  cardCounts: Record<string, number>
  onDeleteClick: (state: ProjectStateRow) => void
  isDragActive: boolean
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-drop-${columnId}`,
    data: { type: 'column-drop', columnId },
  })

  return (
    <SortableContext items={stateIds} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={cx(
          'flex flex-col gap-2 rounded-lg',
          isDragActive ? 'min-h-[60px]' : 'min-h-0',
          isOver && isDragActive && stateIds.length === 0 && 'bg-secondary',
        )}
      >
        {stateIds.map((stateId) => {
          const state = states.find((s) => s.state_id === stateId)
          if (!state) return null
          return (
            <SortableStateCard key={stateId} id={stateId} containerId={columnId} activeCardId={activeId}>
              <StateCard
                state={state}
                taskCount={cardCounts[stateId] ?? 0}
                onDeleteClick={onDeleteClick}
              />
            </SortableStateCard>
          )
        })}
      </div>
    </SortableContext>
  )
}

// ---------------------------------------------------------------------------
// SidebarDropZone — unassigned states with SortableContext + useDroppable
// ---------------------------------------------------------------------------

function SidebarDropZone({
  unassignedStates,
  unassignedStateIds,
  cardCounts,
  onDeleteClick,
  onCreateState,
  isDragActive,
  activeId,
}: {
  unassignedStates: ProjectStateRow[]
  unassignedStateIds: string[]
  cardCounts: Record<string, number>
  onDeleteClick: (state: ProjectStateRow) => void
  onCreateState?: BoardSettingProps['onCreateState']
  isDragActive: boolean
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned-sidebar',
    data: { type: 'sidebar' },
  })

  return (
    <div
      ref={setNodeRef}
      className={cx(
        'flex w-[288px] shrink-0 flex-col gap-2 rounded-lg bg-secondary_alt p-2',
        isOver && isDragActive && 'ring-2 ring-brand-solid',
      )}
    >
      <div className="flex flex-col">
        <p className="text-md font-semibold text-secondary">Estados sin asignar</p>
        <p className="text-xs text-tertiary">Las actividades con estos estados no seran visibles.</p>
      </div>

      <SortableContext items={unassignedStateIds} strategy={verticalListSortingStrategy}>
        <div className={cx(
          'flex flex-col gap-2',
          isDragActive && unassignedStates.length === 0 && 'min-h-[60px]',
        )}>
          {unassignedStateIds.map((stateId) => {
            const state = unassignedStates.find((s) => s.state_id === stateId)
            if (!state) return null
            return (
              <SortableStateCard key={stateId} id={stateId} containerId="sidebar" activeCardId={activeId}>
                <StateCard
                  state={state}
                  taskCount={cardCounts[stateId] ?? 0}
                  onDeleteClick={onDeleteClick}
                />
              </SortableStateCard>
            )
          })}
        </div>
      </SortableContext>

      {unassignedStates.length === 0 && !isDragActive && (
        <div className="flex flex-col items-center gap-1 py-4 text-center">
          <p className="text-md font-semibold text-secondary">Sin estados</p>
          <p className="text-xs text-tertiary">Crea un estado usando el boton de abajo.</p>
        </div>
      )}

      {onCreateState && (
        <div className="rounded-lg bg-secondary">
          <StateCreateInline onCreateState={onCreateState} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BoardSetting — main component
// DnD patterns ported from kanban-board.tsx, adapted for state assignment model
// ---------------------------------------------------------------------------

export function BoardSetting({
  columns,
  states,
  cardCounts,
  projectName,
  projectSlug,
  onBack,
  onCreateState,
  onDeleteState,
  onColumnRename,
  onColumnDelete,
  onColumnAdd,
  onColumnsReorder,
  assignState,
  unassignState,
}: BoardSettingProps) {
  const [dragType, setDragType] = useState<'column' | 'state' | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragColumnState, setDragColumnState] = useState<Map<string, string[]> | null>(null)
  const [dragSidebarOrder, setDragSidebarOrder] = useState<string[] | null>(null)
  const [rejectedColumnId, setRejectedColumnId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectStateRow | null>(null)

  const sensors = useSensors(
    useSensor(SmartPointerSensor, { activationConstraint: { distance: 5 } }),
  )

  // ---- Computed values ----

  const columnIds = useMemo(() => columns.map((c) => c.column_id), [columns])

  // Container→stateIds map: uses drag snapshot during drag, otherwise live columns
  const containerStateMap = useMemo(() => {
    if (dragColumnState) return dragColumnState
    const map = new Map<string, string[]>()
    for (const col of columns) map.set(col.column_id, [...col.state_ids])
    return map
  }, [columns, dragColumnState])

  const assignedStateIds = useMemo(() => {
    const ids = new Set<string>()
    for (const stateIds of containerStateMap.values()) {
      for (const id of stateIds) ids.add(id)
    }
    return ids
  }, [containerStateMap])

  const unassignedStates = useMemo(
    () => states.filter((s) => !assignedStateIds.has(s.state_id)),
    [states, assignedStateIds],
  )

  const unassignedStateIds = useMemo(() => {
    if (dragSidebarOrder) return dragSidebarOrder
    return unassignedStates.map((s) => s.state_id)
  }, [unassignedStates, dragSidebarOrder])

  // ---- Modifiers — horizontal lock for column drags only ----
  const modifiers = useMemo(
    () => (dragType === 'column' ? [restrictToHorizontalAxis] : []),
    [dragType],
  )

  // ---- rAF throttle ref for handleDragOver (from kanban-board) ----
  const dragOverRafRef = useRef<number | null>(null)
  useEffect(() => {
    return () => {
      if (dragOverRafRef.current !== null) cancelAnimationFrame(dragOverRafRef.current)
    }
  }, [])

  // ---- Collision detection — ported from kanban-board.tsx ----
  // Filter droppable containers by drag type to prevent interference
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (dragType === 'column') {
        // For columns: only consider other column sortable IDs
        const columnContainers = args.droppableContainers.filter((c) =>
          columnIds.includes(String(c.id)),
        )
        return closestCenter({ ...args, droppableContainers: columnContainers })
      }

      // For states: filter OUT column sortable IDs (those are for column reorder).
      // Keep: state cards, column-drop-* zones, unassigned-sidebar
      const stateContainers = args.droppableContainers.filter((c) => {
        const id = String(c.id)
        if (columnIds.includes(id)) return false
        return true
      })
      return closestCorners({ ...args, droppableContainers: stateContainers })
    },
    [dragType, columnIds],
  )

  // Stable ref wrapper — prevents DndContext from re-evaluating collisions when
  // deps change mid-drag (infinite render loop prevention, from kanban-board.tsx)
  const collisionDetectionRef = useRef(collisionDetection)
  collisionDetectionRef.current = collisionDetection
  const stableCollisionDetection: CollisionDetection = useCallback(
    (args) => collisionDetectionRef.current(args),
    [],
  )

  // ---- Find which container (column_id or 'sidebar') a state is currently in ----
  const findContainerOfState = useCallback((stateId: string): string | null => {
    for (const [containerId, sIds] of containerStateMap.entries()) {
      if (sIds.includes(stateId)) return containerId
    }
    if (unassignedStateIds.includes(stateId)) return 'sidebar'
    return null
  }, [containerStateMap, unassignedStateIds])

  // ---- Handlers ----

  const handleDragStart = useCallback((event: DragStartEvent) => {
    _boardSettingDragActive = true
    const type = event.active.data.current?.type as 'column' | 'state' | null
    setDragType(type)
    setActiveId(String(event.active.id))

    // Snapshot state internally — parent won't re-render during drag (from kanban-board pattern)
    if (type === 'state') {
      const map = new Map<string, string[]>()
      for (const col of columns) map.set(col.column_id, [...col.state_ids])
      setDragColumnState(map)
      setDragSidebarOrder(unassignedStates.map((s) => s.state_id))
    }
  }, [columns, unassignedStates])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (dragType !== 'state') return
    const { active, over } = event
    if (!over) {
      setRejectedColumnId(null)
      return
    }

    const activeStateId = String(active.id)
    const overId = String(over.id)
    const overData = over.data.current

    // Cancel pending rAF — only the latest dragOver per frame matters (from kanban-board)
    if (dragOverRafRef.current !== null) {
      cancelAnimationFrame(dragOverRafRef.current)
    }

    dragOverRafRef.current = requestAnimationFrame(() => {
      dragOverRafRef.current = null

      // Resolve target container
      let targetContainerId: string | null = null
      if (overId === 'unassigned-sidebar' || overData?.type === 'sidebar') {
        targetContainerId = 'sidebar'
      } else if (overId.startsWith('column-drop-')) {
        targetContainerId = overId.replace('column-drop-', '')
      } else if (overData?.containerId) {
        targetContainerId = overData.containerId as string
      }

      if (!targetContainerId) {
        setRejectedColumnId(null)
        return
      }

      // 1-state-per-column rejection (D-07)
      if (targetContainerId !== 'sidebar') {
        const currentStates = dragColumnState?.get(targetContainerId) ?? []
        const isOccupied = currentStates.length > 0 && !currentStates.includes(activeStateId)
        setRejectedColumnId(isOccupied ? targetContainerId : null)
        if (isOccupied) return // Don't move to occupied column
      } else {
        setRejectedColumnId(null)
      }

      // Find source container
      const sourceContainer = findContainerOfState(activeStateId)
      if (!sourceContainer || sourceContainer === targetContainerId) return

      // Move state between containers in drag snapshot
      setDragColumnState((prev) => {
        if (!prev) return prev
        const next = new Map(prev)

        // Remove from source column (if source is a column)
        if (sourceContainer !== 'sidebar') {
          const sourceStates = [...(next.get(sourceContainer) ?? [])]
          next.set(sourceContainer, sourceStates.filter((id) => id !== activeStateId))
        }

        // Add to target column (if target is a column)
        if (targetContainerId !== 'sidebar') {
          const targetStates = [...(next.get(targetContainerId!) ?? [])]
          if (!targetStates.includes(activeStateId)) {
            targetStates.push(activeStateId)
            next.set(targetContainerId!, targetStates)
          }
        }

        return next
      })

      // Update sidebar order
      if (sourceContainer !== 'sidebar' && targetContainerId === 'sidebar') {
        // Moving to sidebar: add to sidebar list
        setDragSidebarOrder((prev) => {
          if (!prev) return [activeStateId]
          if (prev.includes(activeStateId)) return prev
          return [...prev, activeStateId]
        })
      } else if (sourceContainer === 'sidebar' && targetContainerId !== 'sidebar') {
        // Moving from sidebar: remove from sidebar list
        setDragSidebarOrder((prev) => {
          if (!prev) return prev
          return prev.filter((id) => id !== activeStateId)
        })
      }
    })
  }, [dragType, dragColumnState, findContainerOfState])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    // Cancel pending rAF (from kanban-board)
    if (dragOverRafRef.current !== null) {
      cancelAnimationFrame(dragOverRafRef.current)
      dragOverRafRef.current = null
    }

    _boardSettingDragActive = false
    const { active, over } = event

    if (!over) {
      resetDragState()
      return
    }

    const activeType = active.data.current?.type
    const activeItemId = String(active.id)
    const overId = String(over.id)

    if (activeType === 'column') {
      // Column reorder (same as kanban-board)
      if (activeItemId !== overId) {
        const oldIndex = columnIds.indexOf(activeItemId)
        const newIndex = columnIds.indexOf(overId)
        if (oldIndex !== -1 && newIndex !== -1) {
          onColumnsReorder?.(arrayMove(columnIds, oldIndex, newIndex))
        }
      }
    } else if (activeType === 'state') {
      // Find where the state was BEFORE the drag started
      const originalContainer = (() => {
        for (const col of columns) {
          if (col.state_ids.includes(activeItemId)) return col.column_id
        }
        return 'sidebar'
      })()

      // Find where the state is NOW (after dragOver moves)
      const currentContainer = (() => {
        if (dragColumnState) {
          for (const [colId, sIds] of dragColumnState.entries()) {
            if (sIds.includes(activeItemId)) return colId
          }
        }
        if (dragSidebarOrder?.includes(activeItemId)) return 'sidebar'
        return originalContainer
      })()

      // Execute actual assignment/unassignment if container changed
      if (currentContainer !== originalContainer) {
        // Unassign from source column
        if (originalContainer !== 'sidebar') {
          unassignState?.(originalContainer, activeItemId)
        }
        // Assign to target column
        if (currentContainer !== 'sidebar') {
          assignState?.(currentContainer, activeItemId)
        }
      }

      // Sidebar reorder (visual only)
      if (currentContainer === 'sidebar' && originalContainer === 'sidebar') {
        if (overId !== activeItemId && unassignedStateIds.includes(overId)) {
          // Reorder is visual-only; no persistence
        }
      }
    }

    resetDragState()
  }, [dragType, dragColumnState, dragSidebarOrder, columns, columnIds, unassignedStateIds, onColumnsReorder, assignState, unassignState])

  const handleDragCancel = useCallback(() => {
    if (dragOverRafRef.current !== null) {
      cancelAnimationFrame(dragOverRafRef.current)
      dragOverRafRef.current = null
    }
    _boardSettingDragActive = false
    resetDragState()
  }, [])

  function resetDragState() {
    setDragType(null)
    setActiveId(null)
    setDragColumnState(null)
    setDragSidebarOrder(null)
    setRejectedColumnId(null)
  }

  // ---- Active items for DragOverlay ----

  const activeState = useMemo(() => {
    if (dragType !== 'state' || !activeId) return null
    return states.find((s) => s.state_id === activeId) ?? null
  }, [dragType, activeId, states])

  const activeColumn = useMemo(() => {
    if (dragType !== 'column' || !activeId) return null
    return columns.find((c) => c.column_id === activeId) ?? null
  }, [dragType, activeId, columns])

  // ---- Render ----

  return (
    <div className="flex h-full w-full min-w-0 flex-col gap-8 overflow-hidden pt-4">
      {/* Header — fixed, never scrolls horizontally */}
      <div className="shrink-0 px-8">
        <PageHeader
          title="Board setting"
          breadcrumbs={[
            { icon: HomeLine, href: '/' },
            { label: 'Dashboard', href: '/' },
            { label: 'Projects', href: '/projects' },
            { label: projectName, href: `/projects/${projectSlug}` },
            { label: 'Board setting' },
          ]}
          bordered={false}
          actions={
            <Button size="sm" color="link-gray" iconLeading={ArrowNarrowLeft} onClick={onBack}>
              Back to board
            </Button>
          }
        />
      </div>

      {/* Scrollable board area — independent horizontal scroll (same pattern as kanban-board) */}
      <div className="flex-1 min-w-0 overflow-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={stableCollisionDetection}
        modifiers={modifiers}
        measuring={measuringConfig}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex items-stretch gap-4 min-h-full w-fit px-8 pb-12">
          {/* SIDEBAR — unassigned states */}
          <SidebarDropZone
            unassignedStates={unassignedStates}
            unassignedStateIds={unassignedStateIds}
            cardCounts={cardCounts}
            onDeleteClick={setDeleteTarget}
            onCreateState={onCreateState}
            isDragActive={dragType === 'state'}
            activeId={activeId}
          />

          {/* COLUMNS — sortable horizontally via grip handle */}
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {columns.map((col) => {
              const colStateIds = containerStateMap.get(col.column_id) ?? col.state_ids
              const isRejected = rejectedColumnId === col.column_id

              return (
                <SortableColumnWrapper key={col.column_id} id={col.column_id}>
                  {({ dragHandleListeners, dragHandleAttributes }) => (
                    <div
                      className={cx(
                        'flex w-[288px] flex-col gap-3.5 rounded-lg p-2',
                        isRejected && 'ring-2 ring-error',
                        'transition-all duration-150',
                      )}
                    >
                      <BoardSettingColumnHeader
                        title={col.name}
                        onTitleChange={(name) => onColumnRename?.(col.column_id, name)}
                        onDelete={() => onColumnDelete?.(col.column_id)}
                        dragHandleListeners={dragHandleListeners}
                        dragHandleAttributes={dragHandleAttributes}
                      />

                      <ColumnBody
                        columnId={col.column_id}
                        stateIds={colStateIds}
                        states={states}
                        cardCounts={cardCounts}
                        onDeleteClick={setDeleteTarget}
                        isDragActive={dragType === 'state'}
                        activeId={activeId}
                      />
                    </div>
                  )}
                </SortableColumnWrapper>
              )
            })}
          </SortableContext>

          {/* Add section button — same style as kanban-board.tsx */}
          <button
            type="button"
            onClick={onColumnAdd}
            className="flex shrink-0 cursor-pointer items-center gap-1 self-start rounded-lg px-3.5 py-2.5 text-sm font-semibold text-tertiary whitespace-nowrap transition-colors hover:bg-secondary_hover"
          >
            <Plus className="size-5" />
            <span className="px-0.5">Add section</span>
          </button>
        </div>

        {/* DragOverlay — same pattern as kanban-board.tsx */}
        <DragOverlay dropAnimation={null}>
          {activeState ? (
            <div className="rotate-[1deg] scale-[1.02] shadow-lg cursor-grabbing">
              <StateCard state={activeState} taskCount={cardCounts[activeState.state_id] ?? 0} />
            </div>
          ) : null}
          {activeColumn ? (
            <div className="w-[288px] rounded-lg bg-secondary p-2 opacity-90 shadow-lg">
              <BoardSettingColumnHeader title={activeColumn.name} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      </div>

      {/* Delete Modal */}
      <DeleteStateModal
        state={deleteTarget}
        states={states}
        onDeleteState={onDeleteState ?? (async () => false)}
        onClose={() => setDeleteTarget(null)}
      />

    </div>
  )
}
