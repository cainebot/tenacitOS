'use client'

import React, { useState, useMemo, useCallback, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useSensor,
  useSensors,
  MeasuringStrategy,
  closestCenter,
  closestCorners,
  rectIntersection,
} from '@dnd-kit/core'
import type {
  CollisionDetection,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { Button, PageHeader, cx } from '@circos/ui'
import { ArrowNarrowLeft, HomeLine, Plus } from '@untitledui/icons'
import { SmartPointerSensor } from '@/lib/smart-pointer-sensor'
import { BoardSettingColumnHeader } from './board-setting-column-header'
import { StateCard } from './state-card'
import { StateCreateInline } from './state-create-inline'
import { DeleteStateModal } from './delete-state-modal'
import type { ProjectStateRow, StateCategory } from '@/types/project'
import type { ColumnWithStates } from '@/hooks/use-board-settings'

// ---------------------------------------------------------------------------
// Module-level drag flag — suppresses Realtime patches during drag
// (same pattern as isBoardDragActive in kanban-board.tsx)
// ---------------------------------------------------------------------------

let _boardSettingDragActive = false
export function isBoardSettingDragActive() { return _boardSettingDragActive }

// ---------------------------------------------------------------------------
// Measuring config — re-measures droppable rects after every DOM change
// Prevents stale cached rects causing jumpy repositioning on second+ drags
// ---------------------------------------------------------------------------

const measuringConfig = {
  droppable: { strategy: MeasuringStrategy.Always },
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoardSettingProps {
  /** Board columns with their assigned state IDs */
  columns: ColumnWithStates[]
  /** All project states */
  states: ProjectStateRow[]
  /** Card count per state_id */
  cardCounts: Record<string, number>
  /** Breadcrumb info */
  projectName: string
  projectSlug: string
  /** Callbacks */
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
// SortableColumnWrapper
// Makes a column draggable horizontally via grip-vertical handle only.
// Passes dragHandleListeners/dragHandleAttributes DOWN to BoardSettingColumnHeader
// — NOT spread on the wrapper div (prevents accidental column drag on state card click).
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
      <div ref={setNodeRef} style={style} className="flex flex-col gap-3.5 w-[272px] shrink-0">
        <div className="rounded-lg bg-tertiary h-10" />
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className="shrink-0">
      {children({
        dragHandleListeners: listeners as unknown as Record<string, unknown>,
        dragHandleAttributes: attributes as unknown as Record<string, unknown>,
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SortableStateCard
// Makes a state card draggable vertically in sidebar + cross-container to/from columns.
// Ghost placeholder (bg-tertiary silhouette) at source position during drag (D-09).
// ---------------------------------------------------------------------------

function SortableStateCard({
  id,
  children,
}: {
  id: string
  children: React.ReactElement
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: 'state', stateId: id },
  })

  const style = { transform: CSS.Transform.toString(transform), transition }

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="relative">
        <div className="invisible">{children}</div>
        <div className="absolute inset-0 rounded-xl bg-tertiary" />
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style}>
      {React.cloneElement(children, {
        dragAttributes: attributes as unknown as Record<string, unknown>,
        dragListeners: listeners as unknown as Record<string, unknown>,
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// UnassignedSidebar
// Dual DnD role: (1) its states are vertically sortable via SortableContext,
// (2) the sidebar itself is a droppable target (useDroppable) for states from columns.
// ---------------------------------------------------------------------------

function UnassignedSidebar({
  unassignedStates,
  unassignedStateIds,
  cardCounts,
  onDeleteClick,
  onCreateState,
}: {
  unassignedStates: ProjectStateRow[]
  unassignedStateIds: string[]
  cardCounts: Record<string, number>
  onDeleteClick: (state: ProjectStateRow) => void
  onCreateState?: BoardSettingProps['onCreateState']
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
        isOver && 'ring-2 ring-brand-solid',
      )}
    >
      <div className="flex flex-col">
        <p className="text-md font-semibold text-secondary">Estados sin asignar</p>
        <p className="text-xs text-tertiary">Las actividades con estos estados no seran visibles.</p>
      </div>

      <SortableContext items={unassignedStateIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {unassignedStateIds.map((stateId) => {
            const state = unassignedStates.find((s) => s.state_id === stateId)
            if (!state) return null
            return (
              <SortableStateCard key={stateId} id={stateId}>
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

      {unassignedStates.length === 0 && (
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
// ColumnDropTarget
// Droppable zone within a column body — allows states to be dropped into it.
// ---------------------------------------------------------------------------

function ColumnDropTarget({
  columnId,
  children,
}: {
  columnId: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-drop-${columnId}`,
    data: { type: 'column', columnId },
  })

  return (
    <div
      ref={setNodeRef}
      className={cx(
        'flex flex-col gap-2 min-h-[60px] rounded-lg p-1',
        isOver && 'bg-secondary',
      )}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BoardSetting — main component
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
  // ---- Drag state ----
  const [dragType, setDragType] = useState<'column' | 'state' | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragColumns, setDragColumns] = useState<ColumnWithStates[] | null>(null)
  const [dragUnassignedOrder, setDragUnassignedOrder] = useState<string[] | null>(null)
  const [rejectedColumnId, setRejectedColumnId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectStateRow | null>(null)

  // ---- Computed values ----
  const effectiveColumns = dragColumns ?? columns

  const assignedStateIds = useMemo(() => {
    const ids = new Set<string>()
    for (const col of effectiveColumns) {
      for (const id of col.state_ids) ids.add(id)
    }
    return ids
  }, [effectiveColumns])

  const unassignedStates = useMemo(
    () => states.filter((s) => !assignedStateIds.has(s.state_id)),
    [states, assignedStateIds],
  )

  const unassignedStateIds = useMemo(() => {
    if (dragUnassignedOrder) return dragUnassignedOrder
    return unassignedStates.map((s) => s.state_id)
  }, [unassignedStates, dragUnassignedOrder])

  const columnIds = useMemo(() => effectiveColumns.map((c) => c.column_id), [effectiveColumns])

  // ---- Sensors ----
  const sensors = useSensors(
    useSensor(SmartPointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // ---- Modifiers — horizontal lock for column drags only (D-01) ----
  const modifiers = useMemo(
    () => (dragType === 'column' ? [restrictToHorizontalAxis] : []),
    [dragType],
  )

  // ---- rAF ref for throttled dragOver (CRITICAL — prevents oscillation) ----
  const dragOverRafRef = useRef<number | null>(null)

  // ---- Collision detection (CRITICAL — stable ref prevents infinite render loop) ----
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (dragType === 'column') return closestCenter(args)
      // For state drags: closestCorners for better cross-container detection
      const cornerCollisions = closestCorners(args)
      if (cornerCollisions.length > 0) return cornerCollisions
      return rectIntersection(args)
    },
    [dragType],
  )

  const collisionDetectionRef = useRef(collisionDetection)
  collisionDetectionRef.current = collisionDetection
  const stableCollisionDetection: CollisionDetection = useCallback(
    (args) => collisionDetectionRef.current(args),
    [],
  )

  // ---- Handlers ----

  function handleDragStart(event: DragStartEvent) {
    _boardSettingDragActive = true
    const type = event.active.data.current?.type as 'column' | 'state' | null
    setDragType(type)
    setActiveId(String(event.active.id))
    if (type === 'state') {
      setDragColumns([...columns])
      setDragUnassignedOrder(unassignedStates.map((s) => s.state_id))
    }
    if (type === 'column') {
      setDragColumns([...columns])
    }
  }

  function handleDragOver(event: DragOverEvent) {
    if (dragType !== 'state') return
    const { active, over } = event
    if (!over) return

    // Cancel any pending rAF — only the latest dragOver per frame is processed
    if (dragOverRafRef.current !== null) {
      cancelAnimationFrame(dragOverRafRef.current)
    }

    dragOverRafRef.current = requestAnimationFrame(() => {
      dragOverRafRef.current = null

      const activeStateId = String(active.id)
      const overId = String(over.id)
      const overData = over.data.current

      // Detect if hovering directly over a column container or its drop target
      const isOverColumn = overData?.type === 'column'
      const targetColumnId = isOverColumn
        ? (overData?.columnId as string | undefined) ?? overId
        : null

      // 1-state-per-column rejection (D-07)
      if (targetColumnId) {
        const targetCol = (dragColumns ?? columns).find((c) => c.column_id === targetColumnId)
        const isOccupied =
          targetCol &&
          targetCol.state_ids.length > 0 &&
          !targetCol.state_ids.includes(activeStateId)
        setRejectedColumnId(isOccupied ? targetColumnId : null)
      } else {
        setRejectedColumnId(null)
      }
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    // Cancel any pending rAF
    if (dragOverRafRef.current !== null) {
      cancelAnimationFrame(dragOverRafRef.current)
      dragOverRafRef.current = null
    }

    _boardSettingDragActive = false
    const { active, over } = event

    if (!over) {
      setDragType(null)
      setActiveId(null)
      setDragColumns(null)
      setDragUnassignedOrder(null)
      setRejectedColumnId(null)
      return
    }

    const activeType = active.data.current?.type
    const activeItemId = String(active.id)
    const overId = String(over.id)
    const overData = over.data.current

    if (activeType === 'column') {
      // Column reorder (D-01)
      if (activeItemId !== overId) {
        const oldIndex = columnIds.indexOf(activeItemId)
        const newIndex = columnIds.indexOf(overId)
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(columnIds, oldIndex, newIndex)
          onColumnsReorder?.(newOrder)
        }
      }
    } else if (activeType === 'state') {
      const isDropOnColumn = overData?.type === 'column'
      const isDropOnSidebar =
        overId === 'unassigned-sidebar' || overData?.type === 'sidebar'
      const isDropOnUnassignedState =
        unassignedStateIds.includes(overId) && overId !== activeItemId

      // Determine actual target column for column drops
      const targetColumnId = isDropOnColumn
        ? (overData?.columnId as string | undefined) ?? overId
        : null

      // Rejection guard (D-07) — snap back without API call
      if (isDropOnColumn && targetColumnId && rejectedColumnId === targetColumnId) {
        setDragColumns(null)
        setDragUnassignedOrder(null)
        setDragType(null)
        setActiveId(null)
        setRejectedColumnId(null)
        return
      }

      if (isDropOnColumn && targetColumnId) {
        // Assign state to column (D-06 sidebar->column)
        const sourceCol = (dragColumns ?? columns).find((c) =>
          c.state_ids.includes(activeItemId),
        )
        if (sourceCol) {
          unassignState?.(sourceCol.column_id, activeItemId)
        }
        assignState?.(targetColumnId, activeItemId)
      } else if (isDropOnSidebar || isDropOnUnassignedState) {
        // Unassign from column (D-06 column->sidebar)
        const sourceCol = (dragColumns ?? columns).find((c) =>
          c.state_ids.includes(activeItemId),
        )
        if (sourceCol) {
          unassignState?.(sourceCol.column_id, activeItemId)
        }

        // Reorder within sidebar (D-10) if dropped on another unassigned state
        if (isDropOnUnassignedState && dragUnassignedOrder) {
          const oldIdx = dragUnassignedOrder.indexOf(activeItemId)
          const newIdx = dragUnassignedOrder.indexOf(overId)
          if (oldIdx !== -1 && newIdx !== -1) {
            // Sidebar reorder is visual-only (no persistence yet)
            setDragUnassignedOrder(arrayMove(dragUnassignedOrder, oldIdx, newIdx))
          }
        }
      }
    }

    setDragType(null)
    setActiveId(null)
    setDragColumns(null)
    if (!(activeType === 'state' && (unassignedStateIds.includes(overId) && overId !== activeItemId))) {
      setDragUnassignedOrder(null)
    }
    setRejectedColumnId(null)
  }

  function handleDragCancel() {
    if (dragOverRafRef.current !== null) {
      cancelAnimationFrame(dragOverRafRef.current)
      dragOverRafRef.current = null
    }
    _boardSettingDragActive = false
    setDragType(null)
    setActiveId(null)
    setDragColumns(null)
    setDragUnassignedOrder(null)
    setRejectedColumnId(null)
  }

  // ---- Render ----
  return (
    <div className="flex h-full flex-col gap-8 pt-4">
      {/* Header */}
      <div className="px-8">
        <PageHeader
          title="Board setting"
          breadcrumbs={[
            { label: 'Home', icon: HomeLine, href: '/' },
            { label: projectName, href: `/projects/${projectSlug}` },
            { label: 'Board setting' },
          ]}
          actions={
            <Button
              size="sm"
              color="link-gray"
              iconLeading={ArrowNarrowLeft}
              onClick={onBack}
            >
              Back to board
            </Button>
          }
        />
      </div>

      {/* Single DndContext wrapping BOTH sidebar and columns */}
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
        <div className="flex flex-1 gap-4 overflow-x-auto px-8 pb-12">
          {/* SIDEBAR — unassigned states (D-06, D-10) */}
          <UnassignedSidebar
            unassignedStates={unassignedStates}
            unassignedStateIds={unassignedStateIds}
            cardCounts={cardCounts}
            onDeleteClick={setDeleteTarget}
            onCreateState={onCreateState}
          />

          {/* COLUMNS — sortable horizontally (D-01) */}
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-6">
              {effectiveColumns.map((col) => {
                const assignedState =
                  col.state_ids.length > 0
                    ? states.find((s) => s.state_id === col.state_ids[0])
                    : null
                const isRejected = rejectedColumnId === col.column_id

                return (
                  <SortableColumnWrapper key={col.column_id} id={col.column_id}>
                    {({ dragHandleListeners, dragHandleAttributes }) => (
                      <div
                        className={cx(
                          'flex w-[272px] shrink-0 flex-col gap-2 rounded-lg border-2 p-2',
                          isRejected ? 'border-error' : 'border-transparent',
                          'transition-colors duration-150',
                        )}
                      >
                        <BoardSettingColumnHeader
                          title={col.name}
                          onTitleChange={(name) => onColumnRename?.(col.column_id, name)}
                          onDelete={() => onColumnDelete?.(col.column_id)}
                          dragHandleListeners={dragHandleListeners}
                          dragHandleAttributes={dragHandleAttributes}
                        />

                        {/* Column body — single state slot (1-state-per-column D-07) */}
                        <ColumnDropTarget columnId={col.column_id}>
                          {assignedState && (
                            <StateCard
                              state={assignedState}
                              taskCount={cardCounts[assignedState.state_id] ?? 0}
                              onDeleteClick={setDeleteTarget}
                            />
                          )}
                        </ColumnDropTarget>
                      </div>
                    )}
                  </SortableColumnWrapper>
                )
              })}
            </div>
          </SortableContext>

          {/* Add section button (D-03) */}
          <div className="flex shrink-0 items-start pt-0">
            <Button
              size="sm"
              color="secondary"
              iconLeading={Plus}
              onClick={onColumnAdd}
            >
              Add section
            </Button>
          </div>
        </div>

        {/* DragOverlay (D-08) — rotate/scale/shadow for state, static for column */}
        <DragOverlay dropAnimation={null}>
          {activeId && dragType === 'state' && (() => {
            const activeState = states.find((s) => s.state_id === activeId)
            if (!activeState) return null
            return (
              <div className="rotate-[1deg] scale-[1.02] shadow-lg cursor-grabbing">
                <StateCard
                  state={activeState}
                  taskCount={cardCounts[activeState.state_id] ?? 0}
                />
              </div>
            )
          })()}
          {activeId && dragType === 'column' && (() => {
            const activeCol = columns.find((c) => c.column_id === activeId)
            if (!activeCol) return null
            return (
              <div className="w-[272px] rounded-lg bg-secondary p-2 shadow-lg cursor-grabbing">
                <BoardSettingColumnHeader title={activeCol.name} />
              </div>
            )
          })()}
        </DragOverlay>
      </DndContext>

      {/* Delete Modal — unchanged */}
      <DeleteStateModal
        state={deleteTarget}
        states={states}
        onDeleteState={onDeleteState ?? (async () => false)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
