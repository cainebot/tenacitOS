'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DotsGrid, Edit05 } from '@untitledui/icons'
import { Badge, Button, cx } from '@circos/ui'
import type { Zone } from '@/features/office/types'

interface ZoneCardProps {
  zone: Zone
  isActive: boolean
  onSelect: (id: string) => void
  onEdit: (id: string) => void
}

export function ZoneCard({ zone, isActive, onSelect, onEdit }: ZoneCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: zone.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(zone.id)}
      className={cx(
        'flex flex-row items-center gap-2 px-[10px] py-[6px] rounded-md border cursor-pointer',
        isActive ? 'bg-brand-primary border-brand' : 'bg-primary border-primary',
      )}
    >
      {/* Grip handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab shrink-0 touch-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <DotsGrid
          className={cx('size-6', isActive ? 'text-brand-primary' : 'text-secondary')}
        />
      </button>

      {/* Badge number */}
      <Badge color={isActive ? 'brand' : 'gray'} size="sm">
        #{zone.displayOrder ?? 1}
      </Badge>

      {/* Label + subtitle column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <p
          className={cx(
            'text-md font-medium truncate',
            isActive ? 'text-brand-primary' : 'text-secondary',
          )}
        >
          {zone.label}
        </p>
        <p
          className={cx(
            'text-xs font-medium truncate',
            isActive ? 'text-brand-secondary' : 'text-tertiary',
          )}
        >
          {zone.type}
        </p>
      </div>

      {/* Color dot */}
      <div
        className="size-5 rounded-full shrink-0"
        style={{ backgroundColor: zone.color }}
      />

      {/* Edit button */}
      <Button
        color="tertiary"
        size="sm"
        iconLeading={Edit05}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation()
          onEdit(zone.id)
        }}
        aria-label="Edit zone"
      />
    </div>
  )
}
