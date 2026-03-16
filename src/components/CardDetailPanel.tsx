'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, MoreHorizontal, Trash2, Settings } from 'lucide-react'
import type { WorkflowStateRow } from '@/types/workflow'
import { useCardDetail } from '@/hooks/useCardDetail'
import { CardFieldEditor } from './CardFieldEditor'
import { CardRichTextEditor } from './CardRichTextEditor'
import { CardFieldReorder } from './CardFieldReorder'
import { CardAttachments } from './CardAttachments'
import { CardHierarchy } from './CardHierarchy'

interface CardDetailPanelProps {
  cardId: string
  onClose: () => void
  onCardDeleted: () => void
  onNavigateToCard?: (cardId: string) => void
}

const PANEL_WIDTH_KEY = 'card-panel-width'
const DEFAULT_WIDTH = 480
const MIN_WIDTH = 360
const MAX_WIDTH = 800

const stateCategoryColors: Record<string, string> = {
  'to-do': 'var(--text-muted, #9ca3af)',
  'in_progress': 'var(--accent, #6366f1)',
  'done': '#22c55e',
}

const cardTypeBadgeColors: Record<string, { bg: string; text: string }> = {
  epic: { bg: '#7c3aed', text: '#fff' },
  story: { bg: '#16a34a', text: '#fff' },
  task: { bg: '#2563eb', text: '#fff' },
  subtask: { bg: '#6b7280', text: '#fff' },
  bug: { bg: '#dc2626', text: '#fff' },
}

function getStoredWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH
  const stored = localStorage.getItem(PANEL_WIDTH_KEY)
  const parsed = stored ? parseInt(stored, 10) : NaN
  if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) return parsed
  return DEFAULT_WIDTH
}

export function CardDetailPanel({
  cardId,
  onClose,
  onCardDeleted,
  onNavigateToCard,
}: CardDetailPanelProps) {
  const { card, fieldDefs, loading, error, updateField, updateCustomField, moveCard, deleteCard, reorderField, refetch } =
    useCardDetail(cardId)

  const [width, setWidth] = useState<number>(DEFAULT_WIDTH)
  const [showOverflow, setShowOverflow] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)
  const [visible, setVisible] = useState(false)

  // Workflow states for the state dropdown
  const [workflowStates, setWorkflowStates] = useState<WorkflowStateRow[]>([])

  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  // Initialize width from localStorage
  useEffect(() => {
    setWidth(getStoredWidth())
    // Trigger slide-in animation
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // Fetch workflow states when card loads
  useEffect(() => {
    if (card?.workflow_id) {
      fetch(`/api/workflows/${card.workflow_id}/states`)
        .then((r) => r.ok ? r.json() : [])
        .then((states: WorkflowStateRow[]) => setWorkflowStates(states))
        .catch(() => {})
    }
  }, [card?.workflow_id])

  // Esc key closes panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Resize handle
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    startX.current = e.clientX
    startWidth.current = width

    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return
      const delta = startX.current - ev.clientX
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setWidth(newWidth)
    }

    const onUp = () => {
      isResizing.current = false
      setWidth((w) => {
        localStorage.setItem(PANEL_WIDTH_KEY, String(w))
        return w
      })
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [width])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await deleteCard()
      onCardDeleted()
      onClose()
    } catch (err) {
      console.error('Failed to delete card:', err)
      setDeleting(false)
    }
  }, [deleteCard, onCardDeleted, onClose])

  // Build combined core + custom fields list for reorder
  const coreFields = [
    { id: 'card_type', type: 'core' as const, position: 0, label: 'Type' },
    { id: 'priority', type: 'core' as const, position: 1, label: 'Priority' },
    { id: 'assigned_agent_id', type: 'core' as const, position: 2, label: 'Assignee' },
    { id: 'due_date', type: 'core' as const, position: 3, label: 'Due Date' },
    { id: 'labels', type: 'core' as const, position: 4, label: 'Labels' },
  ]

  const customFields = fieldDefs.map((f) => ({
    id: f.field_id,
    type: 'custom' as const,
    position: f.position + 100,
    label: f.name,
  }))

  const allFields = [...coreFields, ...customFields].sort((a, b) => a.position - b.position)

  // Apply localStorage core field order
  const getOrderedFields = () => {
    if (!card) return allFields
    const storageKey = `card-field-order-${card.workflow_id}`
    const stored = localStorage.getItem(storageKey)
    if (!stored) return allFields
    try {
      const coreOrder: string[] = JSON.parse(stored)
      const coreWithOrder = coreFields.map((f) => {
        const idx = coreOrder.indexOf(f.id)
        return { ...f, position: idx >= 0 ? idx : f.position }
      })
      return [...coreWithOrder, ...customFields].sort((a, b) => a.position - b.position)
    } catch {
      return allFields
    }
  }

  const orderedFields = getOrderedFields()

  const handleReorder = useCallback(
    (fieldId: string, newPosition: number) => {
      const field = allFields.find((f) => f.id === fieldId)
      if (!field) return
      reorderField(fieldId, newPosition, field.type)
    },
    [allFields, reorderField]
  )

  const renderFieldById = (fieldId: string) => {
    if (!card) return null

    // Core fields
    switch (fieldId) {
      case 'card_type': {
        const colors = cardTypeBadgeColors[card.card_type] ?? { bg: '#6b7280', text: '#fff' }
        return (
          <div key="card_type" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', width: '120px', flexShrink: 0 }}>
              Type
            </span>
            <span
              style={{
                display: 'inline-block',
                background: colors.bg,
                color: colors.text,
                borderRadius: '4px',
                padding: '1px 8px',
                fontSize: '11px',
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
              }}
            >
              {card.card_type}
            </span>
          </div>
        )
      }
      case 'priority':
        return (
          <CardFieldEditor
            key="priority"
            label="Priority"
            value={card.priority}
            type="priority"
            onChange={(v) => updateField('priority', v)}
          />
        )
      case 'assigned_agent_id':
        return (
          <CardFieldEditor
            key="assigned_agent_id"
            label="Assignee"
            value={card.assigned_agent_id}
            type="text"
            placeholder="Agent ID or name"
            onChange={(v) => updateField('assigned_agent_id', v || null)}
          />
        )
      case 'due_date':
        return (
          <CardFieldEditor
            key="due_date"
            label="Due Date"
            value={card.due_date ? card.due_date.slice(0, 10) : null}
            type="date"
            onChange={(v) => updateField('due_date', v || null)}
          />
        )
      case 'labels':
        return (
          <CardFieldEditor
            key="labels"
            label="Labels"
            value={card.labels ?? []}
            type="labels"
            placeholder="Add label..."
            onChange={(v) => updateField('labels', v)}
          />
        )
    }

    // Custom fields
    const fieldDef = fieldDefs.find((f) => f.field_id === fieldId)
    if (!fieldDef) return null

    const fieldValue = card.field_values.find((fv) => fv.field_id === fieldId)?.value ?? null
    const cfType = fieldDef.field_type as
      | 'text'
      | 'number'
      | 'date'
      | 'url'
      | 'email'
      | 'select'
      | 'multi_select'
      | 'checkbox'

    return (
      <CardFieldEditor
        key={fieldId}
        label={fieldDef.name}
        value={fieldValue as string | number | boolean | string[] | null}
        type={cfType === 'multi_select' ? 'multi_select' : cfType}
        options={fieldDef.options ?? []}
        onChange={(v) => updateCustomField(fieldId, v)}
      />
    )
  }

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    right: 0,
    top: '48px',
    bottom: '32px',
    width: `${width}px`,
    background: 'var(--surface-elevated, var(--surface, #1a1a2e))',
    borderLeft: '1px solid var(--border)',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    transform: visible ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.2s ease-out',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  }

  const scrollAreaStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
  }

  if (loading) {
    return (
      <div style={panelStyle}>
        <div style={{ padding: '16px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '13px' }}>
          Loading...
        </div>
      </div>
    )
  }

  if (error || !card) {
    return (
      <div style={panelStyle}>
        <div style={{ padding: '16px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '13px' }}>
          {error ?? 'Card not found'}
        </div>
      </div>
    )
  }

  const currentState = workflowStates.find((s) => s.state_id === card.state_id)

  return (
    <>
      {/* Resize handle */}
      <div
        onMouseDown={onResizeMouseDown}
        style={{
          position: 'fixed',
          right: width - 2,
          top: '48px',
          bottom: '32px',
          width: '4px',
          cursor: 'col-resize',
          zIndex: 51,
          background: 'transparent',
        }}
        title="Drag to resize"
      />

      {/* Panel */}
      <div style={panelStyle}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              borderRadius: '4px',
            }}
            title="Close (Esc)"
          >
            <X size={16} />
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowOverflow(!showOverflow)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: '4px',
              }}
            >
              <MoreHorizontal size={16} />
            </button>

            {showOverflow && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '28px',
                  background: 'var(--surface-elevated, var(--surface))',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  minWidth: '160px',
                  zIndex: 100,
                }}
              >
                <button
                  onClick={() => {
                    setShowOverflow(false)
                    setShowDeleteConfirm(true)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ef4444',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    textAlign: 'left',
                  }}
                >
                  <Trash2 size={14} />
                  Delete card
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Click outside to close overflow */}
        {showOverflow && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setShowOverflow(false)}
          />
        )}

        {/* Scrollable content */}
        <div style={scrollAreaStyle}>
          {/* Title */}
          <div style={{ marginBottom: '12px' }}>
            <CardFieldEditor
              label=""
              value={card.title}
              type="text"
              onChange={(v) => updateField('title', v)}
              placeholder="Card title"
            />
          </div>

          {/* State dropdown */}
          <div style={{ marginBottom: '16px' }}>
            {workflowStates.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                  State
                </span>
                <select
                  value={card.state_id}
                  onChange={(e) => moveCard(e.target.value)}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    color: currentState ? (stateCategoryColors[currentState.category] ?? 'var(--text-primary)') : 'var(--text-primary)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {workflowStates.map((s) => (
                    <option key={s.state_id} value={s.state_id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : currentState ? (
              <span
                style={{
                  display: 'inline-block',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '3px 10px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: stateCategoryColors[currentState.category] ?? 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {currentState.name}
              </span>
            ) : null}
          </div>

          {/* Hierarchy — always render (hides if no parent/children) */}
          <CardHierarchy
            breadcrumb={card.breadcrumb}
            parent={card.parent}
            children={card.children}
            currentCardType={card.card_type}
            onNavigateToCard={onNavigateToCard ?? (() => {})}
          />

          {/* Unified fields section */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Fields
              </span>
              <button
                onClick={() => setReorderMode(!reorderMode)}
                title={reorderMode ? 'Done customizing' : 'Customize fields'}
                style={{
                  background: reorderMode ? 'var(--accent, #6366f1)' : 'none',
                  border: reorderMode ? 'none' : '1px solid var(--border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: reorderMode ? '#fff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px 4px',
                  gap: '3px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <Settings size={12} />
                {reorderMode ? 'Done' : 'Customize'}
              </button>
            </div>

            <CardFieldReorder
              fields={orderedFields}
              onReorder={handleReorder}
              editMode={reorderMode}
            >
              {(field) => renderFieldById(field.id)}
            </CardFieldReorder>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
              }}
            >
              Description
            </div>
            <CardRichTextEditor
              value={card.description ?? ''}
              onChange={(html) => updateField('description', html || null)}
              placeholder="Add a description..."
            />
          </div>

          {/* Attachments */}
          <CardAttachments
            cardId={card.card_id}
            attachments={card.attachments}
            onAttachmentAdded={refetch}
          />
        </div>

        {/* Delete confirmation dialog */}
        {showDeleteConfirm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              style={{
                background: 'var(--surface-elevated, var(--surface))',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '360px',
                width: '90%',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 8px 0',
                }}
              >
                Delete this card?
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  margin: '0 0 20px 0',
                  lineHeight: 1.5,
                }}
              >
                This will also delete all child cards, attachments, and comments.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    color: '#fff',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: 600,
                    opacity: deleting ? 0.7 : 1,
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
