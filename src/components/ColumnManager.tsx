'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { BoardColumnRow, WorkflowStateRow } from '@/types/workflow'
import { cx, Button, Checkbox } from '@openclaw/ui'

interface ColumnManagerProps {
  boardId: string
  columns: (BoardColumnRow & { state_ids: string[] })[]
  workflowStates: WorkflowStateRow[]
  onClose: () => void
  onColumnsChanged: () => void
}

interface ColumnItemProps {
  column: BoardColumnRow & { state_ids: string[] }
  workflowStates: WorkflowStateRow[]
  boardId: string
  onRename: (columnId: string, name: string) => Promise<void>
  onToggleHumans: (columnId: string, only_humans: boolean) => Promise<void>
  onDelete: (columnId: string) => Promise<void>
  onDragStart: (e: React.DragEvent, columnId: string) => void
  onDragOver: (e: React.DragEvent, columnId: string) => void
  onDrop: (e: React.DragEvent, columnId: string) => void
  dragOverId: string | null
  error: string | null
}

function ColumnItem({
  column,
  workflowStates,
  onRename,
  onToggleHumans,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverId,
  error,
}: ColumnItemProps) {
  const [editing, setEditing] = useState(false)
  const [nameValue, setNameValue] = useState(column.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setNameValue(column.name) // eslint-disable-line react-hooks/set-state-in-effect -- prop→state sync for inline editing
  }, [column.name])

  const handleNameClick = () => {
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleNameSave = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === column.name) {
      setEditing(false)
      setNameValue(column.name)
      return
    }
    await onRename(column.column_id, trimmed)
    setEditing(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleNameSave()
    if (e.key === 'Escape') {
      setEditing(false)
      setNameValue(column.name)
    }
  }

  const mappedStates = workflowStates.filter((s) => column.state_ids.includes(s.state_id))
  const isDragOver = dragOverId === column.column_id

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, column.column_id)}
      onDragOver={(e) => onDragOver(e, column.column_id)}
      onDrop={(e) => onDrop(e, column.column_id)}
      className={cx(
        'flex items-center gap-2 px-3 py-[10px] rounded-md mb-[6px] transition-[background,border-color] duration-100 cursor-default border',
        isDragOver
          ? 'bg-secondary border-accent'
          : 'bg-secondary border-secondary'
      )}
    >
      {/* Drag handle */}
      <div
        title="Drag to reorder"
        className="cursor-grab text-secondary flex items-center shrink-0 opacity-50 select-none"
      >
        {/* GripVertical icon (3 rows of 2 dots) */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </div>

      {/* Column name — inline editable */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={() => void handleNameSave()}
            onKeyDown={handleNameKeyDown}
            className="w-full font-body text-[13px] font-medium text-primary bg-tertiary border border-accent rounded px-[6px] py-[2px] outline-none"
          />
        ) : (
          <span
            onClick={handleNameClick}
            title="Click to rename"
            className="font-body text-[13px] font-medium text-primary cursor-text block overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {column.name}
          </span>
        )}
        {/* Error for this column */}
        {error && (
          <span className="font-body text-[11px] text-[#f87171] block mt-[2px]">
            {error}
          </span>
        )}
      </div>

      {/* State color dots */}
      <div className="flex gap-[3px] shrink-0">
        {mappedStates.slice(0, 5).map((s) => (
          <div
            key={s.state_id}
            title={s.name}
            style={{ background: s.color || '#6b7280' }}
            className="w-2 h-2 rounded-full shrink-0"
          />
        ))}
        {mappedStates.length > 5 && (
          <span className="font-body text-[10px] text-secondary">
            +{mappedStates.length - 5}
          </span>
        )}
        {mappedStates.length === 0 && (
          <span className="font-body text-[11px] text-secondary opacity-60">
            no states
          </span>
        )}
      </div>

      {/* Only humans toggle */}
      <div
        title="Only humans can move cards out of this column"
        className="shrink-0"
      >
        <Checkbox
          isSelected={column.only_humans}
          onChange={(checked) => void onToggleHumans(column.column_id, checked)}
          className="font-body text-[11px] text-secondary whitespace-nowrap"
          label="humans only"
        />
      </div>

      {/* Delete button */}
      <div className="shrink-0">
        {confirmDelete ? (
          <div className="flex gap-1 items-center">
            <span className="font-body text-[11px] text-error-600">
              Delete?
            </span>
            <Button
              variant="danger"
              size="xs"
              onPress={() => void onDelete(column.column_id)}
              className="text-[11px] px-1.5 py-0.5 h-auto min-h-0"
            >
              Yes
            </Button>
            <Button
              variant="outline"
              size="xs"
              onPress={() => setConfirmDelete(false)}
              className="text-[11px] px-1.5 py-0.5 h-auto min-h-0"
            >
              No
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="xs"
            onPress={() => setConfirmDelete(true)}
            aria-label="Delete column"
            className="text-secondary px-1 py-0.5 h-auto min-h-0 opacity-50 hover:opacity-100 hover:text-error-600"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        )}
      </div>
    </div>
  )
}

export function ColumnManager({
  boardId,
  columns,
  workflowStates,
  onClose,
  onColumnsChanged,
}: ColumnManagerProps) {
  // Local ordered column list for drag-and-drop
  const [orderedColumns, setOrderedColumns] = useState(
    [...columns].sort((a, b) => a.position - b.position)
  )
  const [columnErrors, setColumnErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Add column form state
  const [newName, setNewName] = useState('')
  const [newStateIds, setNewStateIds] = useState<string[]>([])
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const stateDropdownRef = useRef<HTMLDivElement>(null)

  // Sync columns prop to local state when prop changes (after refetch)
  useEffect(() => {
    setOrderedColumns([...columns].sort((a, b) => a.position - b.position))
  }, [columns])

  // Close state dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target as Node)) {
        setShowStateDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const setColumnError = (columnId: string, message: string | null) => {
    setColumnErrors((prev) => {
      if (message === null) {
        const next = { ...prev }
        delete next[columnId]
        return next
      }
      return { ...prev, [columnId]: message }
    })
  }

  const handleRename = useCallback(
    async (columnId: string, name: string) => {
      setColumnError(columnId, null)
      setGlobalError(null)
      try {
        const res = await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setColumnError(columnId, (body as { error?: string }).error ?? 'Rename failed')
          return
        }
        onColumnsChanged()
      } catch {
        setColumnError(columnId, 'Network error')
      }
    },
    [boardId, onColumnsChanged]
  )

  const handleToggleHumans = useCallback(
    async (columnId: string, only_humans: boolean) => {
      setColumnError(columnId, null)
      setGlobalError(null)
      // Optimistic update
      setOrderedColumns((prev) =>
        prev.map((c) => (c.column_id === columnId ? { ...c, only_humans } : c))
      )
      try {
        const res = await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ only_humans }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setColumnError(columnId, (body as { error?: string }).error ?? 'Update failed')
          // Revert optimistic update
          setOrderedColumns((prev) =>
            prev.map((c) => (c.column_id === columnId ? { ...c, only_humans: !only_humans } : c))
          )
          return
        }
        onColumnsChanged()
      } catch {
        setColumnError(columnId, 'Network error')
        setOrderedColumns((prev) =>
          prev.map((c) => (c.column_id === columnId ? { ...c, only_humans: !only_humans } : c))
        )
      }
    },
    [boardId, onColumnsChanged]
  )

  const handleDelete = useCallback(
    async (columnId: string) => {
      setColumnError(columnId, null)
      setGlobalError(null)
      try {
        const res = await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
          method: 'DELETE',
        })
        if (!res.ok && res.status !== 204) {
          const body = await res.json().catch(() => ({}))
          setColumnError(columnId, (body as { error?: string }).error ?? 'Delete failed')
          return
        }
        onColumnsChanged()
      } catch {
        setColumnError(columnId, 'Network error')
      }
    },
    [boardId, onColumnsChanged]
  )

  // Drag-and-drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, columnId: string) => {
    setDragId(columnId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', columnId)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(columnId)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetId: string) => {
      e.preventDefault()
      const sourceId = dragId ?? e.dataTransfer.getData('text/plain')
      setDragId(null)
      setDragOverId(null)

      if (!sourceId || sourceId === targetId) return

      // Reorder locally
      const reordered = [...orderedColumns]
      const sourceIdx = reordered.findIndex((c) => c.column_id === sourceId)
      const targetIdx = reordered.findIndex((c) => c.column_id === targetId)
      if (sourceIdx === -1 || targetIdx === -1) return

      const [moved] = reordered.splice(sourceIdx, 1)
      reordered.splice(targetIdx, 0, moved)
      setOrderedColumns(reordered)

      // Persist reorder
      setGlobalError(null)
      try {
        const res = await fetch(`/api/boards/${boardId}/columns/reorder`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column_ids: reordered.map((c) => c.column_id) }),
        })
        if (!res.ok) {
          setGlobalError('Failed to save column order')
          // Revert
          setOrderedColumns([...columns].sort((a, b) => a.position - b.position))
          return
        }
        onColumnsChanged()
      } catch {
        setGlobalError('Network error while reordering')
        setOrderedColumns([...columns].sort((a, b) => a.position - b.position))
      }
    },
    [boardId, columns, dragId, orderedColumns, onColumnsChanged]
  )

  const handleDragEnd = useCallback(() => {
    setDragId(null)
    setDragOverId(null)
  }, [])

  // Add column
  const handleAddColumn = async () => {
    const name = newName.trim()
    if (!name) {
      setAddError('Column name is required')
      return
    }
    setAdding(true)
    setAddError(null)
    setGlobalError(null)
    try {
      const res = await fetch(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          state_ids: newStateIds,
          position: orderedColumns.length,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setAddError((body as { error?: string }).error ?? 'Failed to add column')
        return
      }
      setNewName('')
      setNewStateIds([])
      onColumnsChanged()
    } catch {
      setAddError('Network error')
    } finally {
      setAdding(false)
    }
  }

  const toggleNewStateId = (stateId: string) => {
    setNewStateIds((prev) =>
      prev.includes(stateId) ? prev.filter((id) => id !== stateId) : [...prev, stateId]
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-[200]"
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-secondary border border-secondary rounded-[10px] w-[540px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-64px)] flex flex-col shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-secondary shrink-0">
          <h2 className="font-display text-base font-bold text-primary m-0">
            Manage Columns
          </h2>
          <Button
            variant="ghost"
            size="xs"
            onPress={onClose}
            aria-label="Close"
            className="text-secondary p-1 h-auto min-h-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>

        {/* Column list */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          onDragLeave={() => setDragOverId(null)}
        >
          {/* Global error */}
          {globalError && (
            <div className="font-body text-xs text-[#f87171] bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)] rounded px-[10px] py-[6px] mb-3">
              {globalError}
            </div>
          )}

          {orderedColumns.length === 0 ? (
            <div className="font-body text-[13px] text-secondary text-center py-6">
              No columns yet. Add one below.
            </div>
          ) : (
            <div onDragEnd={handleDragEnd}>
              {orderedColumns.map((col) => (
                <ColumnItem
                  key={col.column_id}
                  column={col}
                  workflowStates={workflowStates}
                  boardId={boardId}
                  onRename={handleRename}
                  onToggleHumans={handleToggleHumans}
                  onDelete={handleDelete}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  dragOverId={dragOverId}
                  error={columnErrors[col.column_id] ?? null}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add column form */}
        <div className="border-t border-secondary px-5 py-4 shrink-0">
          <div className="font-body text-xs font-semibold text-secondary uppercase tracking-[0.05em] mb-[10px]">
            Add Column
          </div>
          <div className="flex gap-2 items-start">
            {/* Name input */}
            <input
              type="text"
              placeholder="Column name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddColumn()
              }}
              className="flex-1 font-body text-[13px] text-primary bg-tertiary border border-secondary rounded-md px-[10px] py-[6px] outline-none focus:border-accent"
            />

            {/* State multi-select */}
            <div ref={stateDropdownRef} className="relative shrink-0">
              <Button
                variant={newStateIds.length > 0 ? 'primary' : 'outline'}
                size="xs"
                onPress={() => setShowStateDropdown((v) => !v)}
                className="whitespace-nowrap"
              >
                States {newStateIds.length > 0 ? `(${newStateIds.length})` : ''}
              </Button>
              {showStateDropdown && (
                <div className="absolute bottom-[calc(100%+4px)] right-0 z-50 bg-secondary border border-secondary rounded-md min-w-[200px] max-h-[200px] overflow-y-auto shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                  {workflowStates.length === 0 ? (
                    <div className="px-3 py-[10px] font-body text-xs text-secondary">
                      No workflow states available
                    </div>
                  ) : (
                    workflowStates.map((s) => (
                      <div
                        key={s.state_id}
                        className="flex items-center gap-2 px-3 py-[7px] border-b border-secondary hover:bg-secondary"
                      >
                        <Checkbox
                          isSelected={newStateIds.includes(s.state_id)}
                          onChange={() => toggleNewStateId(s.state_id)}
                          className="font-body text-[13px] text-primary"
                          label={
                            <span className="flex items-center gap-2">
                              <span
                                style={{ background: s.color || '#6b7280' }}
                                className="w-2 h-2 rounded-full shrink-0"
                              />
                              {s.name}
                            </span>
                          }
                        />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Add button */}
            <Button
              variant="primary"
              size="xs"
              onPress={() => void handleAddColumn()}
              isDisabled={adding}
              className="shrink-0 font-semibold"
            >
              {adding ? 'Adding...' : 'Add'}
            </Button>
          </div>

          {/* Add error */}
          {addError && (
            <div className="font-body text-xs text-[#f87171] mt-[6px]">
              {addError}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
