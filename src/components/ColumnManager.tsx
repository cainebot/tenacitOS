'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { BoardColumnRow, WorkflowStateRow } from '@/types/workflow'

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
    setNameValue(column.name)
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        background: isDragOver ? 'var(--surface-alt, rgba(99,102,241,0.08))' : 'var(--surface)',
        border: `1px solid ${isDragOver ? 'var(--accent, #6366f1)' : 'var(--border)'}`,
        borderRadius: '6px',
        marginBottom: '6px',
        transition: 'background 0.1s ease, border-color 0.1s ease',
        cursor: 'default',
      }}
    >
      {/* Drag handle */}
      <div
        title="Drag to reorder"
        style={{
          cursor: 'grab',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          opacity: 0.5,
          userSelect: 'none',
        }}
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
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={() => void handleNameSave()}
            onKeyDown={handleNameKeyDown}
            style={{
              width: '100%',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              background: 'var(--surface-elevated, var(--surface))',
              border: '1px solid var(--accent, #6366f1)',
              borderRadius: '4px',
              padding: '2px 6px',
              outline: 'none',
            }}
          />
        ) : (
          <span
            onClick={handleNameClick}
            title="Click to rename"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              cursor: 'text',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {column.name}
          </span>
        )}
        {/* Error for this column */}
        {error && (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              color: '#f87171',
              display: 'block',
              marginTop: '2px',
            }}
          >
            {error}
          </span>
        )}
      </div>

      {/* State color dots */}
      <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
        {mappedStates.slice(0, 5).map((s) => (
          <div
            key={s.state_id}
            title={s.name}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: s.color || '#6b7280',
              flexShrink: 0,
            }}
          />
        ))}
        {mappedStates.length > 5 && (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '10px',
              color: 'var(--text-secondary)',
            }}
          >
            +{mappedStates.length - 5}
          </span>
        )}
        {mappedStates.length === 0 && (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              opacity: 0.6,
            }}
          >
            no states
          </span>
        )}
      </div>

      {/* Only humans toggle */}
      <label
        title="Only humans can move cards out of this column"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <input
          type="checkbox"
          checked={column.only_humans}
          onChange={(e) => void onToggleHumans(column.column_id, e.target.checked)}
          style={{ accentColor: 'var(--accent, #6366f1)', cursor: 'pointer' }}
        />
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          humans only
        </span>
      </label>

      {/* Delete button */}
      <div style={{ flexShrink: 0 }}>
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                color: '#f87171',
              }}
            >
              Delete?
            </span>
            <button
              onClick={() => void onDelete(column.column_id)}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                background: '#f87171',
                border: 'none',
                borderRadius: '3px',
                color: 'white',
                padding: '2px 6px',
                cursor: 'pointer',
              }}
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '3px',
                color: 'var(--text-secondary)',
                padding: '2px 6px',
                cursor: 'pointer',
              }}
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete column"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '2px 4px',
              opacity: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '3px',
              transition: 'opacity 0.1s ease',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#f87171'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.5'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            }}
          >
            {/* X icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
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
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 200,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 201,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          width: '540px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Manage Columns
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background =
                'var(--surface-alt, rgba(255,255,255,0.08))'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'none'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Column list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
          }}
          onDragLeave={() => setDragOverId(null)}
        >
          {/* Global error */}
          {globalError && (
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: '#f87171',
                background: 'rgba(248, 113, 113, 0.1)',
                border: '1px solid rgba(248, 113, 113, 0.3)',
                borderRadius: '4px',
                padding: '6px 10px',
                marginBottom: '12px',
              }}
            >
              {globalError}
            </div>
          )}

          {orderedColumns.length === 0 ? (
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                padding: '24px 0',
              }}
            >
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
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '16px 20px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '10px',
            }}
          >
            Add Column
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            {/* Name input */}
            <input
              type="text"
              placeholder="Column name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddColumn()
              }}
              style={{
                flex: 1,
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                background: 'var(--surface-elevated, var(--surface))',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '6px 10px',
                outline: 'none',
              }}
              onFocus={(e) => {
                ;(e.target as HTMLInputElement).style.borderColor = 'var(--accent, #6366f1)'
              }}
              onBlur={(e) => {
                ;(e.target as HTMLInputElement).style.borderColor = 'var(--border)'
              }}
            />

            {/* State multi-select */}
            <div ref={stateDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setShowStateDropdown((v) => !v)}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: newStateIds.length > 0 ? 'white' : 'var(--text-secondary)',
                  background: newStateIds.length > 0 ? 'var(--accent, #6366f1)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                States {newStateIds.length > 0 ? `(${newStateIds.length})` : ''}
              </button>
              {showStateDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 4px)',
                    right: 0,
                    zIndex: 50,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    minWidth: '200px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  {workflowStates.length === 0 ? (
                    <div
                      style={{
                        padding: '10px 12px',
                        fontFamily: 'var(--font-body)',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      No workflow states available
                    </div>
                  ) : (
                    workflowStates.map((s) => (
                      <label
                        key={s.state_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '7px 12px',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          borderBottom: '1px solid var(--border)',
                        }}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLLabelElement).style.background =
                            'var(--surface-alt, rgba(255,255,255,0.05))'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLLabelElement).style.background = 'transparent'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={newStateIds.includes(s.state_id)}
                          onChange={() => toggleNewStateId(s.state_id)}
                          style={{ accentColor: 'var(--accent, #6366f1)' }}
                        />
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: s.color || '#6b7280',
                            flexShrink: 0,
                          }}
                        />
                        {s.name}
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Add button */}
            <button
              onClick={() => void handleAddColumn()}
              disabled={adding}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 600,
                background: adding ? 'var(--surface)' : 'var(--accent, #6366f1)',
                border: 'none',
                borderRadius: '6px',
                color: adding ? 'var(--text-secondary)' : 'white',
                padding: '6px 16px',
                cursor: adding ? 'not-allowed' : 'pointer',
                flexShrink: 0,
                transition: 'background 0.1s ease',
              }}
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>

          {/* Add error */}
          {addError && (
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: '#f87171',
                marginTop: '6px',
              }}
            >
              {addError}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
