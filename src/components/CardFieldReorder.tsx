'use client'

import { useState, useRef, useCallback } from 'react'
import { GripVertical } from 'lucide-react'

export interface FieldDescriptor {
  id: string
  type: 'core' | 'custom'
  position: number
  label: string
}

interface FieldReorderProps {
  fields: FieldDescriptor[]
  onReorder: (fieldId: string, newPosition: number) => void
  children: (field: FieldDescriptor) => React.ReactNode
  editMode: boolean
}

export function CardFieldReorder({ fields, onReorder, children, editMode }: FieldReorderProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const dragSourceIndex = useRef<number>(-1)

  const handleDragStart = useCallback((e: React.DragEvent, id: string, index: number) => {
    if (!editMode) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    setDraggedId(id)
    dragSourceIndex.current = index
  }, [editMode])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (!editMode) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropIndex(index)
  }, [editMode])

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    const fieldId = e.dataTransfer.getData('text/plain')
    if (!fieldId || dragSourceIndex.current === targetIndex) {
      setDraggedId(null)
      setDropIndex(null)
      return
    }
    onReorder(fieldId, targetIndex)
    setDraggedId(null)
    setDropIndex(null)
    dragSourceIndex.current = -1
  }, [onReorder])

  const handleDragEnd = useCallback(() => {
    setDraggedId(null)
    setDropIndex(null)
    dragSourceIndex.current = -1
  }, [])

  return (
    <div>
      {fields.map((field, index) => {
        const isDragging = draggedId === field.id
        const showDropIndicator = editMode && dropIndex === index && draggedId !== field.id

        return (
          <div
            key={field.id}
            draggable={editMode}
            onDragStart={(e) => handleDragStart(e, field.id, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '4px',
              opacity: isDragging ? 0.4 : 1,
              cursor: editMode ? 'grab' : 'default',
              transition: 'opacity 0.15s',
            }}
          >
            {/* Drop indicator line above this item */}
            {showDropIndicator && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'var(--brand-600)',
                  borderRadius: '1px',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Drag handle */}
            {editMode && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  paddingTop: '5px',
                  color: "var(--text-quaternary-500)",
                  cursor: 'grab',
                  flexShrink: 0,
                  userSelect: 'none',
                }}
                title={`Drag to reorder: ${field.label}`}
              >
                <GripVertical size={14} />
              </div>
            )}

            {/* Field content */}
            <div style={{ flex: 1 }}>
              {children(field)}
            </div>
          </div>
        )
      })}

      {/* Drop indicator at end of list */}
      {editMode && dropIndex === fields.length && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDropIndex(fields.length) }}
          onDrop={(e) => handleDrop(e, fields.length)}
          style={{
            height: '2px',
            background: 'var(--brand-600)',
            borderRadius: '1px',
            margin: '2px 0',
          }}
        />
      )}
    </div>
  )
}
