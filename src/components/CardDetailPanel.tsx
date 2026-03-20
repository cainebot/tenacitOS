'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, MoreHorizontal, Trash2, Settings } from 'lucide-react'
import type { WorkflowStateRow } from '@/types/workflow'
import { useCardDetail } from '@/hooks/useCardDetail'
import { CardFieldEditor } from './CardFieldEditor'
import { CardRichTextEditor } from './CardRichTextEditor'
import { CardFieldReorder } from './CardFieldReorder'
import { CardAttachments } from './CardAttachments'
import { CardChildTasks } from './CardChildTasks'
import { CustomFieldManager } from './CustomFieldManager'
import { CardActivityTimeline } from './CardActivityTimeline'
import { cx, ConfirmActionDialog } from '@openclaw/ui'

interface CardDetailPanelProps {
  cardId: string
  cardCode?: string | null // JIRA-style code from board (e.g. "SP-3")
  cardCodeMap?: Record<string, string> // card_id → code for parent/child lookups
  onClose: () => void
  onCardDeleted: () => void
  onNavigateToCard?: (cardId: string) => void
}

const PANEL_WIDTH_KEY = 'card-panel-width'
const DEFAULT_WIDTH = 480
const MIN_WIDTH = 360
const MAX_WIDTH = 800

const stateCategoryColors: Record<string, string> = {
  'to-do': 'text-muted',
  'in_progress': 'text-accent',
  'done': 'text-success',
}

const cardTypeBadgeColors: Record<string, { bg: string; text: string }> = {
  epic: { bg: '#7c3aed', text: '#fff' },
  story: { bg: '#16a34a', text: '#fff' },
  task: { bg: '#2563eb', text: '#fff' },
  subtask: { bg: '#6b7280', text: '#fff' },
  bug: { bg: '#dc2626', text: '#fff' },
}

/** Format a snake_case / slug state name into Title Case (e.g. "cold_calling" → "Cold Calling") */
function formatStateName(name: string): string {
  return name
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
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
  cardCode,
  cardCodeMap = {},
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
  const [showFieldManager, setShowFieldManager] = useState(false)
  const [visible, setVisible] = useState(false)

  // Workflow states for the state dropdown
  const [workflowStates, setWorkflowStates] = useState<WorkflowStateRow[]>([])
  // Agents for the assignee dropdown
  const [agents, setAgents] = useState<{ agent_id: string; name: string; emoji?: string }[]>([])
  // Existing labels for autocomplete
  const [existingLabels, setExistingLabels] = useState<string[]>([])

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

  // Fetch agents for assignee dropdown (once)
  useEffect(() => {
    fetch('/api/agents/list')
      .then((r) => r.ok ? r.json() : [])
      .then((data: { agent_id: string; name: string }[]) => setAgents(data))
      .catch(() => {})
    // Fetch existing labels for autocomplete (once)
    fetch('/api/labels')
      .then((r) => r.ok ? r.json() : [])
      .then((data: string[]) => setExistingLabels(data))
      .catch(() => {})
  }, [])

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
          <div key="card_type" className="flex flex-row items-center gap-2 py-1">
            <span className="font-body text-xs text-muted w-[120px] shrink-0">
              Type
            </span>
            <span
              style={{ background: colors.bg, color: colors.text }}
              className="inline-block rounded px-2 py-[1px] text-[11px] font-body font-medium"
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
            type="select"
            options={agents.map((a) => a.agent_id)}
            optionLabels={Object.fromEntries(agents.map((a) => [a.agent_id, `${a.emoji ?? ''} ${a.name}`.trim()]))}
            placeholder="Select agent"
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
            options={existingLabels}
            placeholder="Add label..."
            onChange={(v) => {
              updateField('labels', v)
              // Add new labels to existingLabels for immediate reuse
              const newLabels = v as string[]
              setExistingLabels((prev) => {
                const merged = new Set([...prev, ...newLabels])
                return [...merged].sort()
              })
            }}
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

  const panelClasses = cx(
    'fixed right-0 top-12 bottom-8 flex flex-col z-50',
    'bg-surface-elevated border-l border-border overflow-hidden',
    'shadow-[-4px_0_24px_rgba(0,0,0,0.2)]',
    'transition-transform duration-200 ease-out',
    visible ? 'translate-x-0' : 'translate-x-full'
  )

  if (loading) {
    return (
      <div className={panelClasses} style={{ width: `${width}px` }}>
        <div className="p-5 text-muted font-body text-[13px]">
          Loading...
        </div>
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className={panelClasses} style={{ width: `${width}px` }}>
        <div className="p-5 text-muted font-body text-[13px]">
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
        className="fixed top-12 bottom-8 w-1 cursor-col-resize z-[51] bg-transparent"
        style={{ right: width - 2 }}
        title="Drag to resize"
      />

      {/* Panel */}
      <div className={panelClasses} style={{ width: `${width}px` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <button
            onClick={onClose}
            className="bg-transparent border-0 cursor-pointer text-secondary flex items-center p-1 rounded"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowOverflow(!showOverflow)}
              className="bg-transparent border-0 cursor-pointer text-secondary flex items-center p-1 rounded"
            >
              <MoreHorizontal size={16} />
            </button>

            {showOverflow && (
              <div className="absolute right-0 top-7 bg-surface-elevated border border-border rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.2)] min-w-[160px] z-[100]">
                <button
                  onClick={() => {
                    setShowOverflow(false)
                    setShowDeleteConfirm(true)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-0 cursor-pointer text-[#ef4444] font-body text-[13px] text-left"
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
            className="fixed inset-0 z-[99]"
            onClick={() => setShowOverflow(false)}
          />
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Breadcrumb — JIRA style: parent codes as links + current code */}
          {(() => {
            const currentCode = card.code || cardCode
            const breadcrumbItems = card.breadcrumb ?? []
            const hasBreadcrumb = breadcrumbItems.length > 0 || currentCode

            if (!hasBreadcrumb) return null

            const badgeStyle = (type: string): React.CSSProperties => ({
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1px 6px',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'lowercase',
              background: cardTypeBadgeColors[type]?.bg ?? '#6b7280',
              color: cardTypeBadgeColors[type]?.text ?? '#fff',
            })

            return (
              <div className="mb-2 flex items-center gap-1 flex-wrap">
                {/* Parent breadcrumb chain */}
                {breadcrumbItems.map((bc) => {
                  const parentCode = bc.code || cardCodeMap[bc.card_id]
                  return (
                    <span key={bc.card_id} className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onNavigateToCard?.(bc.card_id)}
                        className="font-body text-xs font-semibold text-accent tracking-wide cursor-pointer bg-transparent border-0 p-0 no-underline"
                        title={bc.title}
                      >
                        {parentCode || bc.card_type.toUpperCase()}
                      </button>
                      <span style={badgeStyle(bc.card_type)}>{bc.card_type}</span>
                      <span className="text-muted text-[10px] mx-[2px]">/</span>
                    </span>
                  )
                })}
                {/* Current card */}
                {currentCode && (
                  <span className="font-body text-xs font-semibold text-primary cursor-default tracking-wide">
                    {currentCode}
                  </span>
                )}
                {card.card_type && (
                  <span style={badgeStyle(card.card_type)}>{card.card_type}</span>
                )}
              </div>
            )
          })()}

          {/* Title — inline editable heading */}
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const newTitle = (e.currentTarget.textContent ?? '').trim()
              if (newTitle && newTitle !== card.title) {
                updateField('title', newTitle)
              } else if (!newTitle) {
                e.currentTarget.textContent = card.title
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() }
            }}
            className="font-body text-base font-semibold text-primary outline-none py-[2px] mb-3 leading-[1.3] break-words border-b border-transparent focus:border-accent transition-[border-color] duration-150 cursor-text"
            onBlurCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
          >
            {card.title}
          </div>

          {/* State dropdown */}
          <div className="mb-4">
            {workflowStates.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="font-body text-xs text-muted">
                  State
                </span>
                <select
                  value={card.state_id}
                  onChange={(e) => moveCard(e.target.value)}
                  className={cx(
                    'font-body text-xs font-medium bg-surface border border-border rounded-md px-2 py-[3px] cursor-pointer outline-none',
                    currentState ? (stateCategoryColors[currentState.category] ?? 'text-primary') : 'text-primary'
                  )}
                >
                  {workflowStates.map((s) => (
                    <option key={s.state_id} value={s.state_id}>
                      {formatStateName(s.name)}
                    </option>
                  ))}
                </select>
              </div>
            ) : currentState ? (
              <span
                className={cx(
                  'inline-block bg-surface border border-border rounded-md px-[10px] py-[3px] text-xs font-medium font-body',
                  stateCategoryColors[currentState.category] ?? 'text-primary'
                )}
              >
                {formatStateName(currentState.name)}
              </span>
            ) : null}
          </div>

          {/* Child tasks — JIRA-style create/link subtasks */}
          <CardChildTasks
            children={card.children}
            parentCardId={card.card_id}
            parentCardType={card.card_type}
            workflowId={card.workflow_id}
            stateId={card.state_id}
            cardCodeMap={cardCodeMap}
            onNavigateToCard={onNavigateToCard ?? (() => {})}
            onChildCreated={refetch}
          />

          {/* Unified fields section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-body text-[11px] font-semibold text-muted uppercase tracking-[0.05em]">
                Fields
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowFieldManager(true)}
                  title="Manage custom field definitions"
                  className="bg-transparent border border-border rounded cursor-pointer text-muted flex items-center px-[6px] py-[2px] gap-[3px] text-[11px] font-body"
                >
                  Manage Fields
                </button>
                <button
                  onClick={() => setReorderMode(!reorderMode)}
                  title={reorderMode ? 'Done customizing' : 'Customize fields'}
                  className={cx(
                    'rounded cursor-pointer flex items-center px-1 py-[2px] gap-[3px] text-[11px] font-body',
                    reorderMode
                      ? 'bg-accent border-0 text-white'
                      : 'bg-transparent border border-border text-muted'
                  )}
                >
                  <Settings size={12} />
                  {reorderMode ? 'Done' : 'Customize'}
                </button>
              </div>
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
          <div className="mb-4">
            <div className="font-body text-[11px] font-semibold text-muted uppercase tracking-[0.05em] mb-2">
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

          {/* Activity Timeline */}
          <div className="mt-4">
            <div className="border-t border-border mb-3" />
            <div className="font-body text-[11px] font-semibold text-muted uppercase tracking-[0.05em] mb-[10px]">
              Activity
            </div>
            <CardActivityTimeline
              cardId={card.card_id}
              comments={card.comments}
              workflowId={card.workflow_id}
            />
          </div>
        </div>

      </div>

      {/* Delete confirmation dialog — uses ConfirmActionDialog (no name required for cards) */}
      <ConfirmActionDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => { if (!open) setShowDeleteConfirm(false) }}
        title="Delete card?"
        description="This action cannot be undone. All child cards, attachments, and comments will also be deleted."
        onConfirm={handleDelete}
        isConfirming={deleting}
        confirmLabel="Delete Card"
        confirmingLabel="Deleting..."
      />

      {/* Custom Field Manager modal */}
      {showFieldManager && (
        <CustomFieldManager
          workflowId={card.workflow_id}
          cardType={card.card_type}
          onClose={() => setShowFieldManager(false)}
          onFieldsChanged={refetch}
        />
      )}
    </>
  )
}
