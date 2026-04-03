"use client"

import { type ReactNode, memo, useMemo, useCallback, useRef, useEffect } from "react"
import { Plus } from "@untitledui/icons"
import { cx } from "@circos/ui"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { AnimatePresence, motion } from "motion/react"
import {
  KanbanColumnHeader,
  type KanbanColumnHeaderProps,
  type KanbanColumnHeaderSize,
} from "./kanban-column-header"

const columnWidthClasses: Record<KanbanColumnHeaderSize, string> = {
  sm: "w-[272px]",
  md: "w-[312px]",
}

// ---------------------------------------------------------------------------
// SortableCard — wraps any card ReactNode with drag handle
// ---------------------------------------------------------------------------

interface SortableCardProps {
  id: string
  columnId: string
  activeCardId?: string | null
  children: ReactNode
}

export function SortableCard({ id, columnId, activeCardId, children }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { type: "card", columnId } })

  const isBeingDragged = isDragging || id === activeCardId

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
      className={isBeingDragged ? "cursor-grabbing" : "cursor-pointer"}
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
// KanbanColumn — renders header + sortable card list + add button
// DnD context is managed by the parent KanbanBoard
// ---------------------------------------------------------------------------

export interface KanbanColumnItem {
  id: string
}

export type KanbanColumnSize = KanbanColumnHeaderSize

export interface KanbanColumnProps<T extends KanbanColumnItem>
  extends Pick<KanbanColumnHeaderProps, "title" | "active"> {
  columnId: string
  size?: KanbanColumnSize
  items: T[]
  activeCardId?: string | null
  isDragActive?: boolean
  onTitleChange?: (colId: string, title: string) => void
  onDelete?: (colId: string) => void
  onAddCard?: (columnId: string) => void
  addingCard?: ReactNode
  renderCard: (item: T) => ReactNode
  className?: string
}

function KanbanColumnInner<T extends KanbanColumnItem>({
  columnId,
  size = "sm",
  title,
  onTitleChange,
  onDelete,
  active,
  items,
  activeCardId,
  isDragActive,
  onAddCard,
  addingCard,
  renderCard,
  className,
}: KanbanColumnProps<T>) {
  const isMd = size === "md"
  const itemIds = useMemo(() => items.map((i) => i.id), [items])

  // Make the column itself a droppable target so cards can be dropped into empty columns
  const { setNodeRef } = useDroppable({
    id: `droppable-${columnId}`,
    data: { type: "column", columnId },
  })

  const handleTitleChange = useCallback((newTitle: string) => {
    onTitleChange?.(columnId, newTitle)
  }, [columnId, onTitleChange])

  const handleDelete = useCallback(() => {
    onDelete?.(columnId)
  }, [columnId, onDelete])

  const handleAddCard = useCallback(() => {
    onAddCard?.(columnId)
  }, [columnId, onAddCard])

  // Freeze column count during drag — prevents KanbanColumnHeader re-renders
  // from count badge changes as cards move between columns (saves characterData mutations)
  const lastStableCount = useRef(items.length)
  useEffect(() => {
    if (!isDragActive) lastStableCount.current = items.length
  }, [items.length, isDragActive])

  return (
    <div className={cx("flex flex-col gap-3.5", columnWidthClasses[size], className)}>
      <div className="sticky top-0 z-10 -mb-3.5 bg-primary pb-3.5">
        <KanbanColumnHeader
          title={title}
          onTitleChange={handleTitleChange}
          onDelete={handleDelete}
          onAddCard={onAddCard ? handleAddCard : undefined}
          size={size}
          count={isDragActive ? lastStableCount.current : items.length}
          active={active}
        />
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cx(
            "flex flex-col gap-2 rounded-lg",
            isDragActive
              ? items.length === 0 ? "min-h-[200px]" : "min-h-[48px]"
              : "min-h-0",
          )}
          style={isDragActive ? undefined : { contain: "layout style" }}
        >
          {isDragActive ? (
            items.map((item) => (
              <SortableCard key={item.id} id={item.id} columnId={columnId} activeCardId={activeCardId}>
                {renderCard(item)}
              </SortableCard>
            ))
          ) : (
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <SortableCard id={item.id} columnId={columnId} activeCardId={activeCardId}>
                    {renderCard(item)}
                  </SortableCard>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </SortableContext>

      {/* Inline card creator slot */}
      {addingCard}

      {/* Add card button */}
      <button
        type="button"
        data-add-card-button
        onClick={handleAddCard}
        className={cx(
          "flex w-full cursor-pointer items-center gap-1 rounded-lg font-semibold text-tertiary transition-colors hover:bg-secondary_hover",
          isMd ? "px-4 py-2.5 text-md" : "px-3.5 py-2.5 text-sm",
        )}
      >
        <Plus className="size-5" />
        <span className="px-0.5">Add card</span>
      </button>
    </div>
  )
}

export const KanbanColumn = memo(KanbanColumnInner) as typeof KanbanColumnInner
