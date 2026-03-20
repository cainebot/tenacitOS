'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Trash2, Plus, Check } from 'lucide-react'
import type { CardType, CustomFieldType, CustomFieldDefinitionRow } from '@/types/workflow'

interface CustomFieldManagerProps {
  workflowId: string
  cardType?: CardType | null
  onClose: () => void
  onFieldsChanged: () => void
}

const FIELD_TYPE_COLORS: Record<CustomFieldType, string> = {
  text: '#6366f1',
  number: '#f59e0b',
  date: '#10b981',
  url: '#3b82f6',
  email: '#8b5cf6',
  select: '#ec4899',
  multi_select: '#f97316',
  checkbox: '#14b8a6',
}

const CARD_TYPES: CardType[] = ['epic', 'story', 'task', 'subtask', 'bug']
const CUSTOM_FIELD_TYPES: CustomFieldType[] = [
  'text', 'number', 'date', 'url', 'email', 'select', 'multi_select', 'checkbox',
]

export function CustomFieldManager({
  workflowId,
  cardType,
  onClose,
  onFieldsChanged,
}: CustomFieldManagerProps) {
  const [fields, setFields] = useState<CustomFieldDefinitionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit name state — tracks which field is being edited
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  // Delete confirmation
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Add field form
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text')
  const [newFieldOptions, setNewFieldOptions] = useState('')
  const [newFieldCardType, setNewFieldCardType] = useState<CardType | ''>('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const fetchFields = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = cardType ? `?card_type=${cardType}` : ''
      const res = await fetch(`/api/workflows/${workflowId}/fields${params}`)
      if (!res.ok) throw new Error(`Failed to load fields: ${res.statusText}`)
      const data: CustomFieldDefinitionRow[] = await res.json()
      setFields(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [workflowId, cardType])

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  const handleEditStart = (field: CustomFieldDefinitionRow) => {
    setEditingFieldId(field.field_id)
    setEditingName(field.name)
  }

  const handleEditSave = async (fieldId: string) => {
    const trimmed = editingName.trim()
    if (!trimmed) {
      setEditingFieldId(null)
      return
    }
    try {
      const res = await fetch(`/api/workflows/${workflowId}/fields/${fieldId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) throw new Error(`Failed to update field: ${res.statusText}`)
      setEditingFieldId(null)
      await fetchFields()
      onFieldsChanged()
    } catch (err) {
      console.error('Failed to rename field:', err)
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent, fieldId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleEditSave(fieldId)
    } else if (e.key === 'Escape') {
      setEditingFieldId(null)
    }
  }

  const handleDeleteConfirm = async (fieldId: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/fields/${fieldId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`Failed to delete field: ${res.statusText}`)
      setDeletingFieldId(null)
      await fetchFields()
      onFieldsChanged()
    } catch (err) {
      console.error('Failed to delete field:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = newFieldName.trim()
    if (!trimmedName) {
      setAddError('Field name is required')
      return
    }
    setAdding(true)
    setAddError(null)
    try {
      const body: Record<string, unknown> = {
        name: trimmedName,
        field_type: newFieldType,
      }
      if (newFieldCardType) {
        body.card_type = newFieldCardType
      }
      if ((newFieldType === 'select' || newFieldType === 'multi_select') && newFieldOptions.trim()) {
        body.options = newFieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
      }

      const res = await fetch(`/api/workflows/${workflowId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Failed to create field: ${res.statusText}`)

      // Reset form
      setNewFieldName('')
      setNewFieldType('text')
      setNewFieldOptions('')
      setNewFieldCardType('')
      await fetchFields()
      onFieldsChanged()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err))
    } finally {
      setAdding(false)
    }
  }

  const showOptions = newFieldType === 'select' || newFieldType === 'multi_select'

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        {/* Dialog */}
        <div
          style={{
            background: 'var(--bg-tertiary)',
            border: "1px solid var(--border-primary)",
            borderRadius: '10px',
            width: '480px',
            maxWidth: '95vw',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: "1px solid var(--border-primary)",
              flexShrink: 0,
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-sora), system-ui, sans-serif',
                fontSize: '15px',
                fontWeight: 600,
                color: "var(--text-primary-900)",
                margin: 0,
              }}
            >
              Manage Custom Fields
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: "var(--text-tertiary-600)",
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: '4px',
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Field list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
            {loading ? (
              <p style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '13px', color: "var(--text-quaternary-500)", textAlign: 'center', padding: '16px 0' }}>
                Loading fields...
              </p>
            ) : error ? (
              <p style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '13px', color: '#ef4444', padding: '8px 0' }}>
                {error}
              </p>
            ) : fields.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '13px', color: "var(--text-quaternary-500)", textAlign: 'center', padding: '16px 0' }}>
                No custom fields yet. Add one below.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {fields.map((field) => (
                  <div
                    key={field.field_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      background: 'var(--bg-secondary)',
                      border: "1px solid var(--border-primary)",
                      borderRadius: '6px',
                    }}
                  >
                    {/* Field name — click to edit inline */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingFieldId === field.field_id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => handleEditSave(field.field_id)}
                            onKeyDown={(e) => handleEditKeyDown(e, field.field_id)}
                            style={{
                              flex: 1,
                              fontFamily: 'var(--font-inter), system-ui, sans-serif',
                              fontSize: '13px',
                              color: "var(--text-primary-900)",
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--brand-600)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              outline: 'none',
                            }}
                          />
                          <button
                            onMouseDown={(e) => { e.preventDefault(); handleEditSave(field.field_id) }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--brand-600)',
                              display: 'flex',
                              padding: '2px',
                            }}
                            title="Save"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditStart(field)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'text',
                            color: "var(--text-primary-900)",
                            fontFamily: 'var(--font-inter), system-ui, sans-serif',
                            fontSize: '13px',
                            padding: 0,
                            textAlign: 'left',
                            width: '100%',
                          }}
                          title="Click to edit name"
                        >
                          {field.name}
                        </button>
                      )}
                    </div>

                    {/* Field type badge */}
                    <span
                      style={{
                        display: 'inline-block',
                        background: FIELD_TYPE_COLORS[field.field_type] + '22',
                        color: FIELD_TYPE_COLORS[field.field_type],
                        border: `1px solid ${FIELD_TYPE_COLORS[field.field_type]}44`,
                        borderRadius: '4px',
                        padding: '1px 7px',
                        fontSize: '10px',
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        fontWeight: 600,
                        letterSpacing: '0.03em',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {field.field_type}
                    </span>

                    {/* Options display (select/multi_select) */}
                    {field.options && field.options.length > 0 && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: "var(--text-quaternary-500)",
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          flexShrink: 0,
                          maxWidth: '100px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={field.options.join(', ')}
                      >
                        {field.options.join(', ')}
                      </span>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => setDeletingFieldId(field.field_id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: "var(--text-quaternary-500)",
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px',
                        borderRadius: '3px',
                        flexShrink: 0,
                      }}
                      title="Delete field"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add field form */}
            <form
              onSubmit={handleAddField}
              style={{
                marginTop: '16px',
                padding: '14px',
                background: 'var(--bg-secondary)',
                border: "1px solid var(--border-primary)",
                borderRadius: '8px',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: "var(--text-quaternary-500)",
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: '0 0 10px 0',
                }}
              >
                Add New Field
              </p>

              {/* Name */}
              <div style={{ marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="Field name (required)"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: '13px',
                    color: "var(--text-primary-900)",
                    background: 'var(--bg-tertiary)',
                    border: "1px solid var(--border-primary)",
                    borderRadius: '6px',
                    padding: '6px 10px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Field type */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                  style={{
                    flex: 1,
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: '13px',
                    color: "var(--text-primary-900)",
                    background: 'var(--bg-tertiary)',
                    border: "1px solid var(--border-primary)",
                    borderRadius: '6px',
                    padding: '6px 8px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {CUSTOM_FIELD_TYPES.map((ft) => (
                    <option key={ft} value={ft}>{ft}</option>
                  ))}
                </select>

                {/* Card type scope */}
                <select
                  value={newFieldCardType}
                  onChange={(e) => setNewFieldCardType(e.target.value as CardType | '')}
                  style={{
                    flex: 1,
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: '13px',
                    color: "var(--text-primary-900)",
                    background: 'var(--bg-tertiary)',
                    border: "1px solid var(--border-primary)",
                    borderRadius: '6px',
                    padding: '6px 8px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">All card types</option>
                  {CARD_TYPES.map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>

              {/* Options (select / multi_select only) */}
              {showOptions && (
                <div style={{ marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="Options (comma-separated)"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    style={{
                      width: '100%',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '13px',
                      color: "var(--text-primary-900)",
                      background: 'var(--bg-tertiary)',
                      border: "1px solid var(--border-primary)",
                      borderRadius: '6px',
                      padding: '6px 10px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {addError && (
                <p style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '12px', color: '#ef4444', margin: '0 0 8px 0' }}>
                  {addError}
                </p>
              )}

              <button
                type="submit"
                disabled={adding}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--brand-600)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  cursor: adding ? 'not-allowed' : 'pointer',
                  color: '#fff',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  opacity: adding ? 0.7 : 1,
                }}
              >
                <Plus size={14} />
                {adding ? 'Adding...' : 'Add Field'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {deletingFieldId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => !deleting && setDeletingFieldId(null)}
        >
          <div
            style={{
              background: 'var(--bg-tertiary)',
              border: "1px solid var(--border-primary)",
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '340px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontFamily: 'var(--font-sora), system-ui, sans-serif',
                fontSize: '15px',
                fontWeight: 600,
                color: "var(--text-primary-900)",
                margin: '0 0 8px 0',
              }}
            >
              Delete field?
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '13px',
                color: "var(--text-tertiary-600)",
                margin: '0 0 20px 0',
                lineHeight: 1.5,
              }}
            >
              All card values for this field will be lost. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeletingFieldId(null)}
                disabled={deleting}
                style={{
                  background: 'none',
                  border: "1px solid var(--border-primary)",
                  borderRadius: '6px',
                  padding: '6px 14px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  color: "var(--text-tertiary-600)",
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(deletingFieldId)}
                disabled={deleting}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  color: '#fff',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
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
    </>
  )
}
