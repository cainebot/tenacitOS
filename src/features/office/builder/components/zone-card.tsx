'use client'

import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Edit05 } from '@untitledui/icons'
import { Badge, Button, GripVertical, cx } from '@circos/ui'
import { useBuilderStore } from '@/features/office/builder/stores/builder-store'
import type { Zone } from '@/features/office/types'

const COLOR_PALETTE = [
  '#6172f3',
  '#15b79e',
  '#f79009',
  '#f04438',
  '#7a5af8',
  '#ee46bc',
  '#2e90fa',
  '#66c61c',
]

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
  const [showColorPicker, setShowColorPicker] = useState(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const updateZone = useBuilderStore((s) => s.updateZone)

  // Close color picker on outside click
  useEffect(() => {
    if (!showColorPicker) return
    const handler = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColorPicker])

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
        <GripVertical
          className={cx('size-6', isActive ? 'text-brand-primary' : 'text-secondary')}
        />
      </button>

      {/* Badge number */}
      <Badge type="modern" color={isActive ? 'brand' : 'gray'} size="md">
        {zone.displayOrder ?? 1}
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

      {/* Color dot with picker */}
      <div className="relative shrink-0 flex" ref={colorPickerRef}>
        <button
          className="size-5 rounded-full shrink-0 border border-secondary"
          style={{ backgroundColor: zone.color }}
          onClick={(e) => {
            e.stopPropagation()
            setShowColorPicker(!showColorPicker)
          }}
          aria-label="Pick zone color"
        />
        {showColorPicker && (
          <div className="absolute right-0 top-7 z-50 w-max bg-primary border border-secondary rounded-lg p-2 shadow-lg grid grid-cols-4 gap-1.5">
            {COLOR_PALETTE.map((color) => (
              <button
                key={color}
                className={cx(
                  'size-6 rounded-full border-2',
                  zone.color === color ? 'border-brand' : 'border-transparent',
                )}
                style={{ backgroundColor: color }}
                onClick={(e) => {
                  e.stopPropagation()
                  updateZone(zone.id, { color })
                  setShowColorPicker(false)
                }}
                aria-label={`Color ${color}`}
              />
            ))}
          </div>
        )}
      </div>

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
