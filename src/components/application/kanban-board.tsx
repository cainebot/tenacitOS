"use client"

import { type ReactNode, useState, useMemo, useCallback } from "react"
import { Plus } from "@untitledui/icons"
import { cx } from "@circos/ui"
import {
  DndContext,
  closestCenter,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type Modifier,
  type CollisionDetection,
  rectIntersection,
  getFirstCollision,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { KanbanColumn, type KanbanColumnItem } from "./kanban-column"

// ---------------------------------------------------------------------------
// Lock drag movement to X axis (columns only)
// ---------------------------------------------------------------------------

const restrictToHorizontalAxis: Modifier = ({ transform }) => ({
  ...transform,
  y: 0,
})

// ---------------------------------------------------------------------------
// SortableColumn — wrapper that makes a column draggable horizontally
// ---------------------------------------------------------------------------

function SortableColumnWrapper({ id, children }: { id: string; children: ReactNode }) {
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
      className="shrink-0"
    >
      {isDragging ? (
        <div className="flex w-[272px] flex-col gap-3.5">
          <div className="h-10 rounded-lg bg-tertiary" />
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
  onColumnsChange?: (columns: KanbanBoardColumn<T>[]) => void
  renderCard: (item: T) => ReactNode
  renderDragOverlay?: (item: T) => ReactNode
  className?: string
}

type DragType = "card" | "column" | null

export function KanbanBoard<T extends KanbanColumnItem>({
  columns,
  onColumnsChange,
  renderCard,
  renderDragOverlay,
  className,
}: KanbanBoardProps<T>) {
  const [dragType, setDragType] = useState<DragType>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns])

  // Find which column a card belongs to
  const findColumnOfCard = useCallback((cardId: string) => {
    return columns.find((col) => col.items.some((item) => item.id === cardId))
  }, [columns])

  // Find active item for overlay
  const activeCard = useMemo(() => {
    if (dragType !== "card" || !activeId) return null
    for (const col of columns) {
      const item = col.items.find((i) => i.id === activeId)
      if (item) return item
    }
    return null
  }, [dragType, activeId, columns])

  const activeColumn = useMemo(() => {
    if (dragType !== "column" || !activeId) return null
    return columns.find((c) => c.id === activeId) ?? null
  }, [dragType, activeId, columns])

  // ------ Handlers ------

  const handleDragStart = (event: DragStartEvent) => {
    const type = event.active.data.current?.type as DragType
    setDragType(type)
    setActiveId(String(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (dragType !== "card") return
    const { active, over } = event
    if (!over) return

    const activeCardId = String(active.id)
    const overData = over.data.current

    // Determine target column
    const overId = String(over.id)
    let targetColumnId: string | undefined
    if (overData?.type === "card") {
      targetColumnId = overData.columnId
    } else if (overData?.type === "column" && overData?.columnId) {
      targetColumnId = overData.columnId
    } else if (overId.startsWith("droppable-")) {
      targetColumnId = overId.replace("droppable-", "")
    } else {
      // over.id might be a column sortable ID
      const col = columns.find((c) => c.id === overId)
      if (col) targetColumnId = col.id
    }

    if (!targetColumnId) return

    const sourceCol = findColumnOfCard(activeCardId)
    if (!sourceCol || sourceCol.id === targetColumnId) {
      // Same column reorder is handled by dnd-kit's SortableContext automatically
      // But we need to handle the actual reorder in dragEnd
      return
    }

    // Cross-column move: move card from source to target in real-time (on hover)
    const sourceItems = [...sourceCol.items]
    const cardIndex = sourceItems.findIndex((i) => i.id === activeCardId)
    if (cardIndex === -1) return
    const [card] = sourceItems.splice(cardIndex, 1)

    const targetCol = columns.find((c) => c.id === targetColumnId)
    if (!targetCol) return
    const targetItems = [...targetCol.items]

    // Insert at the position of the card we're hovering over, or at end
    if (overData?.type === "card") {
      const overIndex = targetItems.findIndex((i) => i.id === String(over.id))
      if (overIndex >= 0) {
        targetItems.splice(overIndex, 0, card)
      } else {
        targetItems.push(card)
      }
    } else {
      targetItems.push(card)
    }

    onColumnsChange?.(
      columns.map((c) => {
        if (c.id === sourceCol.id) return { ...c, items: sourceItems }
        if (c.id === targetColumnId) return { ...c, items: targetItems }
        return c
      }),
    )
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (dragType === "column" && over && active.id !== over.id) {
      const oldIndex = columns.findIndex((c) => c.id === String(active.id))
      const newIndex = columns.findIndex((c) => c.id === String(over.id))
      if (oldIndex !== -1 && newIndex !== -1) {
        onColumnsChange?.(arrayMove(columns, oldIndex, newIndex))
      }
    }

    if (dragType === "card" && over) {
      const activeCardId = String(active.id)
      const overData = over.data.current

      // Same-column reorder
      if (overData?.type === "card" && active.id !== over.id) {
        const col = findColumnOfCard(activeCardId)
        if (col) {
          const oldIndex = col.items.findIndex((i) => i.id === activeCardId)
          const newIndex = col.items.findIndex((i) => i.id === String(over.id))
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            onColumnsChange?.(
              columns.map((c) =>
                c.id === col.id ? { ...c, items: arrayMove(c.items, oldIndex, newIndex) } : c,
              ),
            )
          }
        }
      }
    }

    setDragType(null)
    setActiveId(null)
  }

  const handleDragCancel = () => {
    setDragType(null)
    setActiveId(null)
  }

  const handleColumnTitleChange = useCallback((colId: string, newTitle: string) => {
    onColumnsChange?.(columns.map((c) => c.id === colId ? { ...c, title: newTitle } : c))
  }, [columns, onColumnsChange])

  const handleColumnDelete = useCallback((colId: string) => {
    onColumnsChange?.(columns.filter((c) => c.id !== colId))
  }, [columns, onColumnsChange])

  const handleAddSection = () => {
    const newCol: KanbanBoardColumn<T> = {
      id: `col-${Date.now()}`,
      title: "New section",
      items: [],
    }
    onColumnsChange?.([...columns, newCol])
  }

  // Use different modifiers depending on what's being dragged
  const modifiers = dragType === "column" ? [restrictToHorizontalAxis] : []

  // Collision detection: filter containers by drag type to prevent interference
  const collisionDetection: CollisionDetection = useCallback((args) => {
    if (dragType === "column") {
      // Only collide with other column sortables
      const columnContainers = args.droppableContainers.filter((c) =>
        columnIds.includes(String(c.id)),
      )
      return closestCenter({ ...args, droppableContainers: columnContainers })
    }

    // For cards: only collide with card sortables + column droppables (not column sortables)
    const cardContainers = args.droppableContainers.filter((c) => {
      const id = String(c.id)
      return !columnIds.includes(id)
    })
    const filteredArgs = { ...args, droppableContainers: cardContainers }

    const pointerCollisions = pointerWithin(filteredArgs)
    if (pointerCollisions.length > 0) return pointerCollisions
    return rectIntersection(filteredArgs)
  }, [dragType, columnIds])

  return (
    <div className={cx("flex items-start gap-4 overflow-x-auto", className)}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        modifiers={modifiers}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          {columns.map((col) => (
            <SortableColumnWrapper key={col.id} id={col.id}>
              <KanbanColumn
                columnId={col.id}
                title={col.title}
                onTitleChange={(t) => handleColumnTitleChange(col.id, t)}
                onDelete={() => handleColumnDelete(col.id)}
                items={col.items}
                activeCardId={dragType === "card" ? activeId : null}
                renderCard={renderCard}
              />
            </SortableColumnWrapper>
          ))}
        </SortableContext>

        <DragOverlay dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}>
          {activeCard ? (
            <div className="rotate-[1deg] scale-[1.02] shadow-lg">
              {(renderDragOverlay ?? renderCard)(activeCard)}
            </div>
          ) : null}
          {activeColumn ? (
            <div className="opacity-90">
              <KanbanColumn
                columnId={activeColumn.id}
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
        className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-tertiary whitespace-nowrap transition-colors hover:bg-secondary_hover"
      >
        <Plus className="size-5" />
        <span className="px-0.5">Add section</span>
      </button>
    </div>
  )
}
