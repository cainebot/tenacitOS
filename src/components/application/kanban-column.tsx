"use client"

import { type ReactNode, useMemo } from "react"
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
} from "./kanban-column-header"

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
      className="cursor-grab active:cursor-grabbing"
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

export interface KanbanColumnProps<T extends KanbanColumnItem>
  extends Pick<KanbanColumnHeaderProps, "title" | "onTitleChange" | "onDelete" | "active"> {
  columnId: string
  items: T[]
  activeCardId?: string | null
  onAddCard?: () => void
  renderCard: (item: T) => ReactNode
  className?: string
}

export function KanbanColumn<T extends KanbanColumnItem>({
  columnId,
  title,
  onTitleChange,
  onDelete,
  active,
  items,
  activeCardId,
  onAddCard,
  renderCard,
  className,
}: KanbanColumnProps<T>) {
  const itemIds = useMemo(() => items.map((i) => i.id), [items])

  // Make the column itself a droppable target so cards can be dropped into empty columns
  const { setNodeRef } = useDroppable({
    id: `droppable-${columnId}`,
    data: { type: "column", columnId },
  })

  return (
    <div className={cx("flex w-[272px] flex-col gap-3.5", className)}>
      <KanbanColumnHeader
        title={title}
        onTitleChange={onTitleChange}
        onDelete={onDelete}
        onAddCard={onAddCard}
        count={items.length}
        active={active}
      />

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={cx("flex flex-col gap-2 rounded-lg", activeCardId ? "min-h-[48px]" : "min-h-0")}>
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <SortableCard id={item.id} columnId={columnId} activeCardId={activeCardId}>
                  {renderCard(item)}
                </SortableCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>

      {/* Add card button */}
      <motion.button
        layout
        transition={{ duration: 0.2, ease: "easeOut" }}
        type="button"
        onClick={onAddCard}
        className="flex w-full cursor-pointer items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-tertiary transition-colors hover:bg-secondary_hover"
      >
        <Plus className="size-5" />
        <span className="px-0.5">Add card</span>
      </motion.button>
    </div>
  )
}
