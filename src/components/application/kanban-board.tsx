"use client"

import { type ReactNode, useState, useMemo, useCallback, useRef, useEffect } from "react"
import { Plus } from "@untitledui/icons"
import { cx } from "@circos/ui"
import {
  DndContext,
  closestCenter,
  closestCorners,
  useSensor,
  useSensors,
  DragOverlay,
  MeasuringStrategy,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type Modifier,
  type CollisionDetection,
} from "@dnd-kit/core"
import { SmartPointerSensor } from '@/lib/smart-pointer-sensor'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { KanbanColumn, type KanbanColumnItem, type KanbanColumnSize } from "./kanban-column"

export type KanbanBoardSize = KanbanColumnSize

// ---------------------------------------------------------------------------
// Lock drag movement to X axis (columns only)
// ---------------------------------------------------------------------------

const restrictToHorizontalAxis: Modifier = ({ transform }) => ({
  ...transform,
  y: 0,
})

// Re-measure droppable rects after every DOM change during drag —
// prevents stale cached rects from causing jumpless (instant) repositioning
// on second+ cross-column moves.
const measuringConfig = {
  droppable: { strategy: MeasuringStrategy.Always },
}

// ---------------------------------------------------------------------------
// Module-level drag flag — read by useStoreSyncRealtime to suppress patches during drag
// ---------------------------------------------------------------------------

let _boardDragActive = false
export function isBoardDragActive(): boolean { return _boardDragActive }

// ---------------------------------------------------------------------------
// SortableColumn — wrapper that makes a column draggable horizontally
// ---------------------------------------------------------------------------

function SortableColumnWrapper({ id, size = "sm", children }: { id: string; size?: KanbanColumnSize; children: ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { type: "column" } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      suppressHydrationWarning
      className="shrink-0"
      data-board-column
    >
      {isDragging ? (
        <div className={cx("flex flex-col gap-3.5", size === "md" ? "w-[312px]" : "w-[272px]")}>
          <div className={cx("rounded-lg bg-tertiary", size === "md" ? "h-[42px]" : "h-10")} />
        </div>
      ) : (
        children
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KanbanBoard
// ---------------------------------------------------------------------------

export interface KanbanBoardColumn<T extends KanbanColumnItem> {
  id: string
  title: string
  items: T[]
}

export interface KanbanBoardProps<T extends KanbanColumnItem> {
  columns: KanbanBoardColumn<T>[]
  onColumnsChange?: (columns: KanbanBoardColumn<T>[], meta?: { activeCardId?: string }) => void
  size?: KanbanBoardSize
  renderCard: (item: T) => ReactNode
  renderDragOverlay?: (item: T) => ReactNode
  className?: string
  onAddCard?: (columnId: string) => void
  addingColumnId?: string | null
  renderAddingCard?: (columnId: string) => ReactNode
}

type DragType = "card" | "column" | null

export function KanbanBoard<T extends KanbanColumnItem>({
  columns,
  onColumnsChange,
  size = "sm",
  renderCard,
  renderDragOverlay,
  className,
  onAddCard,
  addingColumnId,
  renderAddingCard,
}: KanbanBoardProps<T>) {
  const [dragType, setDragType] = useState<DragType>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragColumns, setDragColumns] = useState<KanbanBoardColumn<T>[] | null>(null)
  const isDragActive = dragType === "card"

  // During drag, use internal state to avoid parent re-renders
  const effectiveColumns = dragColumns ?? columns

  const sensors = useSensors(
    useSensor(SmartPointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const columnIds = useMemo(() => effectiveColumns.map((c) => c.id), [effectiveColumns])

  // rAF throttle ref for handleDragOver — ensures at most one setDragColumns per animation frame
  const dragOverRafRef = useRef<number | null>(null)

  // Cleanup rAFs on unmount
  useEffect(() => {
    return () => {
      if (dragOverRafRef.current !== null) cancelAnimationFrame(dragOverRafRef.current)
    }
  }, [])

  // Droppable IDs for empty columns — included in card collision detection so empty columns can receive drops
  const emptyColumnDroppableIds = useMemo(
    () => new Set(effectiveColumns.filter((c) => c.items.length === 0).map((c) => `droppable-${c.id}`)),
    [effectiveColumns],
  )

  // Find which column a card belongs to
  const findColumnOfCard = useCallback((cardId: string) => {
    return effectiveColumns.find((col) => col.items.some((item) => item.id === cardId))
  }, [effectiveColumns])

  // Find active item for overlay
  const activeCard = useMemo(() => {
    if (dragType !== "card" || !activeId) return null
    for (const col of effectiveColumns) {
      const item = col.items.find((i) => i.id === activeId)
      if (item) return item
    }
    return null
  }, [dragType, activeId, effectiveColumns])

  const activeColumn = useMemo(() => {
    if (dragType !== "column" || !activeId) return null
    return effectiveColumns.find((c) => c.id === activeId) ?? null
  }, [dragType, activeId, effectiveColumns])

  // ------ Handlers ------

  const handleDragStart = useCallback((event: DragStartEvent) => {
    _boardDragActive = true
    const type = event.active.data.current?.type as DragType
    setDragType(type)
    setActiveId(String(event.active.id))
    // Snapshot columns internally — parent won't re-render during drag
    if (type === "card") setDragColumns([...columns])
  }, [columns])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (dragType !== "card") return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const overData = over.data.current

    // For non-card targets (column droppables), require horizontal overlap
    // to prevent ping-pong oscillation between columns during drag
    if (overData?.type !== "card") {
      const translatedRect = active.rect.current.translated
      if (translatedRect && over.rect) {
        const cardCenterX = translatedRect.left + translatedRect.width / 2
        if (cardCenterX < over.rect.left || cardCenterX > over.rect.left + over.rect.width) {
          return // Card is not physically over this column — skip to prevent oscillation
        }
      }
    }

    // Capture event data into local variables BEFORE the rAF callback —
    // dnd-kit event objects may be pooled/reused between events.
    const activeCardId = String(active.id)
    const overId = String(over.id)
    const overType = overData?.type
    const overColumnId = overData?.columnId
    const draggedTop = active.rect.current.translated?.top ?? 0
    const overRectTop = over.rect?.top ?? 0
    const overRectHeight = over.rect?.height ?? 0

    // When hovering over a column droppable (not a specific card),
    // use pointer position relative to the column to determine top/bottom insertion
    let columnDropIndex: number | undefined
    if (overType !== "card" && over.rect) {
      const columnMidY = overRectTop + overRectHeight / 2
      // If dragged card is in the top half of the column → insert at start, else at end
      columnDropIndex = draggedTop < columnMidY ? 0 : undefined
    }

    // Cancel any pending rAF — only the latest dragOver matters
    if (dragOverRafRef.current !== null) {
      cancelAnimationFrame(dragOverRafRef.current)
    }

    dragOverRafRef.current = requestAnimationFrame(() => {
      dragOverRafRef.current = null

      setDragColumns((prev) => {
        if (!prev) return prev

        // Resolve target column
        const targetColumnId =
          overType === "card" ? overColumnId
          : overColumnId ? overColumnId
          : overId.startsWith("droppable-") ? overId.replace("droppable-", "")
          : prev.find((c) => c.id === overId)?.id

        if (!targetColumnId) return prev

        const sourceCol = prev.find((col) => col.items.some((i) => i.id === activeCardId))
        if (!sourceCol) return prev
        // Same-column card-to-card: skip — handleDragEnd owns same-column reorder (per D-01)
        if (sourceCol.id === targetColumnId && overType === 'card') return prev
        // Already in target column (column-droppable hover)
        if (sourceCol.id === targetColumnId) return prev

        const targetCol = prev.find((c) => c.id === targetColumnId)
        if (!targetCol) return prev
        // Guard: prevent thrashing
        if (targetCol.items.some((i) => i.id === activeCardId)) return prev

        const card = sourceCol.items.find((i) => i.id === activeCardId)!
        const sourceItems = sourceCol.items.filter((i) => i.id !== activeCardId)
        const targetItems = [...targetCol.items]

        if (overType === "card") {
          const overIndex = targetItems.findIndex((i) => i.id === overId)
          targetItems.splice(overIndex >= 0 ? overIndex : targetItems.length, 0, card)
        } else if (columnDropIndex !== undefined) {
          targetItems.splice(columnDropIndex, 0, card)
        } else {
          targetItems.push(card)
        }

        return prev.map((c) => {
          if (c.id === sourceCol.id) return { ...c, items: sourceItems }
          if (c.id === targetColumnId) return { ...c, items: targetItems }
          return c
        })
      })
    })
  }, [dragType])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    // Cancel any pending rAF from dragOver — prevent stale update after drag ends
    if (dragOverRafRef.current !== null) {
      cancelAnimationFrame(dragOverRafRef.current)
      dragOverRafRef.current = null
    }

    const { active, over } = event

    if (dragType === "column" && over && active.id !== over.id) {
      const oldIndex = effectiveColumns.findIndex((c) => c.id === String(active.id))
      const newIndex = effectiveColumns.findIndex((c) => c.id === String(over.id))
      if (oldIndex !== -1 && newIndex !== -1) {
        onColumnsChange?.(arrayMove(effectiveColumns, oldIndex, newIndex))
      }
    }

    if (dragType === "card") {
      // Commit final state to parent
      let finalColumns = dragColumns ?? columns
      if (over) {
        const activeCardId = String(active.id)
        const overData = over.data.current
        // Same-column reorder (cross-column already handled in dragOver)
        if (overData?.type === "card" && active.id !== over.id) {
          const col = finalColumns.find((c) => c.items.some((i) => i.id === activeCardId))
          if (col) {
            const oldIndex = col.items.findIndex((i) => i.id === activeCardId)
            const newIndex = col.items.findIndex((i) => i.id === String(over.id))
            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
              finalColumns = finalColumns.map((c) =>
                c.id === col.id ? { ...c, items: arrayMove(c.items, oldIndex, newIndex) } : c,
              )
            }
          }
        }

        // Fallback: when over target is a column droppable and card is in that column,
        // use pointer Y position to determine insertion position
        if (overData?.type === "column" && overData.columnId) {
          const targetColumnId = overData.columnId as string
          const col = finalColumns.find((c) => c.id === targetColumnId)
          if (col && col.items.some((i) => i.id === activeCardId)) {
            // Card is already in this column — check if position changed based on pointer
            const pointerY = event.activatorEvent instanceof PointerEvent ? event.activatorEvent.clientY : null
            const overRect = over.rect
            if (pointerY !== null && overRect) {
              const relativeY = pointerY - overRect.top
              const slotHeight = overRect.height / Math.max(col.items.length, 1)
              const targetIndex = Math.min(
                Math.floor(relativeY / slotHeight),
                col.items.length - 1,
              )
              const oldIndex = col.items.findIndex((i) => i.id === activeCardId)
              if (oldIndex !== -1 && targetIndex !== oldIndex) {
                finalColumns = finalColumns.map((c) =>
                  c.id === col.id ? { ...c, items: arrayMove(c.items, oldIndex, targetIndex) } : c,
                )
              }
            }
          }
        }
      }
      // Notify parent BEFORE cleanup — onColumnsChange triggers async store updates
      // (via syncEngine.moveSyncCard). Calling it before setDragColumns(null) ensures
      // the board doesn't flash to pre-drag state (which would trigger costly
      // AnimatePresence layout animations for every card × 2 render cycles).
      onColumnsChange?.(finalColumns, { activeCardId: String(active.id) })
    }

    // Reset drag flag AFTER parent notification
    _boardDragActive = false

    // Cleanup drag state — DragOverlay disappears immediately
    setDragColumns(null)
    setDragType(null)
    setActiveId(null)
  }, [dragType, dragColumns, columns, effectiveColumns, onColumnsChange])

  const handleDragCancel = useCallback(() => {
    // Cancel any pending rAF from dragOver — prevent stale update after cancel
    if (dragOverRafRef.current !== null) {
      cancelAnimationFrame(dragOverRafRef.current)
      dragOverRafRef.current = null
    }

    _boardDragActive = false

    setDragColumns(null)
    setDragType(null)
    setActiveId(null)
  }, [])

  const handleColumnTitleChange = useCallback((colId: string, newTitle: string) => {
    onColumnsChange?.(columns.map((c) => c.id === colId ? { ...c, title: newTitle } : c))
  }, [columns, onColumnsChange])

  const handleColumnDelete = useCallback((colId: string) => {
    onColumnsChange?.(columns.filter((c) => c.id !== colId))
  }, [columns, onColumnsChange])

  const handleAddCardForColumn = useCallback((columnId: string) => {
    onAddCard?.(columnId)
  }, [onAddCard])

  const handleAddSection = useCallback(() => {
    const newCol: KanbanBoardColumn<T> = {
      id: `col-${Date.now()}`,
      title: "New section",
      items: [],
    }
    onColumnsChange?.([...columns, newCol])
  }, [columns, onColumnsChange])

  // Use different modifiers depending on what's being dragged
  // Memoized to prevent unnecessary DndContext re-renders
  const modifiers = useMemo(
    () => (dragType === "column" ? [restrictToHorizontalAxis] : []),
    [dragType],
  )

  // Collision detection: filter containers by drag type to prevent interference
  const collisionDetection: CollisionDetection = useCallback((args) => {
    if (dragType === "column") {
      const columnContainers = args.droppableContainers.filter((c) =>
        columnIds.includes(String(c.id)),
      )
      return closestCenter({ ...args, droppableContainers: columnContainers })
    }

    // For cards: closestCorners on card containers + empty column droppable zones.
    // Empty column droppables are only included when the dragged card's center X
    // is within the column's horizontal bounds — this prevents ping-pong where a
    // card oscillates between two columns (card moves A→B, A becomes empty,
    // closestCorners picks A, card moves B→A, B becomes empty → infinite loop).
    const cardCenterX = args.collisionRect.left + args.collisionRect.width / 2

    const cardContainers = args.droppableContainers.filter((c) => {
      const id = String(c.id)
      if (columnIds.includes(id)) return false
      if (id.startsWith('droppable-')) {
        if (!emptyColumnDroppableIds.has(id)) return false
        // Only include if the dragged card is horizontally within this column
        const rect = args.droppableRects.get(c.id)
        if (rect) {
          return cardCenterX >= rect.left && cardCenterX <= rect.right
        }
        return false
      }
      return true
    })
    return closestCorners({ ...args, droppableContainers: cardContainers })
  }, [dragType, columnIds, emptyColumnDroppableIds])

  // Stable ref wrapper — prevents DndContext from re-evaluating collisions when
  // emptyColumnDroppableIds changes mid-drag (which caused an infinite render loop:
  // card moves → source column empties → collisionDetection ref changes → DndContext
  // re-evaluates → card moves back → target empties → loop).
  const collisionDetectionRef = useRef(collisionDetection)
  collisionDetectionRef.current = collisionDetection
  const stableCollisionDetection: CollisionDetection = useCallback(
    (args) => collisionDetectionRef.current(args),
    [],
  )

  return (
    <div className={cx("overflow-auto", className)}>
    <div className="flex items-stretch gap-4 min-h-full px-6 pb-6 w-fit">
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
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          {effectiveColumns.map((col) => (
            <SortableColumnWrapper key={col.id} id={col.id} size={size}>
              <KanbanColumn
                columnId={col.id}
                size={size}
                title={col.title}
                onTitleChange={handleColumnTitleChange}
                onDelete={handleColumnDelete}
                onAddCard={onAddCard ? handleAddCardForColumn : undefined}
                addingCard={addingColumnId === col.id && renderAddingCard ? renderAddingCard(col.id) : undefined}
                items={col.items}
                activeCardId={dragType === "card" ? activeId : null}
                isDragActive={isDragActive}
                renderCard={renderCard}
              />
            </SortableColumnWrapper>
          ))}
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div className="rotate-[1deg] scale-[1.02] shadow-lg">
              {(renderDragOverlay ?? renderCard)(activeCard)}
            </div>
          ) : null}
          {activeColumn ? (
            <div className="opacity-90">
              <KanbanColumn
                columnId={activeColumn.id}
                size={size}
                title={activeColumn.title}
                items={activeColumn.items}
                renderCard={renderCard}
                active
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add section button */}
      <button
        type="button"
        onClick={handleAddSection}
        className="mt-6 flex shrink-0 cursor-pointer items-center gap-1 self-start rounded-lg px-3 py-2 text-sm font-semibold text-tertiary whitespace-nowrap transition-colors hover:bg-secondary_hover"
      >
        <Plus className="size-5" />
        <span className="px-0.5">Add section</span>
      </button>
    </div>
    </div>
  )
}
