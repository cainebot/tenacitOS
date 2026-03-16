'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'

export type FieldEditorType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'priority'
  | 'labels'
  | 'textarea'
  | 'url'
  | 'email'
  | 'multi_select'
  | 'checkbox'
  | 'richtext'

interface FieldEditorProps {
  label: string
  value: string | number | boolean | string[] | null
  type: FieldEditorType
  options?: string[]
  onChange: (value: unknown) => void
  placeholder?: string
  // richtext type needs special rendering from parent
  renderRichText?: (value: string, onChange: (html: string) => void) => React.ReactNode
}

const priorityColors: Record<string, string> = {
  baja: 'var(--text-muted, #9ca3af)',
  media: 'var(--accent, #6366f1)',
  alta: '#ef4444',
}

function formatDate(val: string | null): string {
  if (!val) return ''
  return val.slice(0, 10)
}

export function CardFieldEditor({
  label,
  value,
  type,
  options = [],
  onChange,
  placeholder,
  renderRichText,
}: FieldEditorProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<unknown>(value)
  const [labelInput, setLabelInput] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null)

  const enterEdit = useCallback(() => {
    setDraft(value)
    setEditing(true)
    // Focus input on next tick
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus()
    }, 0)
  }, [value])

  const commitEdit = useCallback(
    (val: unknown) => {
      setEditing(false)
      if (val !== value) {
        onChange(val)
      }
    },
    [value, onChange]
  )

  const cancelEdit = useCallback(() => {
    setDraft(value)
    setEditing(false)
  }, [value])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && type !== 'textarea' && type !== 'richtext') {
        e.preventDefault()
        commitEdit(draft)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        cancelEdit()
      }
    },
    [type, draft, commitEdit, cancelEdit]
  )

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '4px 0',
    minHeight: '28px',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: 'var(--text-muted)',
    width: '120px',
    flexShrink: 0,
    paddingTop: '3px',
    userSelect: 'none',
  }

  const displayStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    color: value ? 'var(--text-primary)' : 'var(--text-muted)',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: '4px',
    flex: 1,
    minHeight: '20px',
    wordBreak: 'break-word',
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    color: 'var(--text-primary)',
    background: 'var(--surface)',
    border: '1px solid var(--accent, #6366f1)',
    borderRadius: '4px',
    padding: '2px 6px',
    flex: 1,
    outline: 'none',
    minHeight: '24px',
  }

  // Checkbox: inline toggle, no edit/display mode
  if (type === 'checkbox') {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>{label}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            style={{ width: '14px', height: '14px', cursor: 'pointer' }}
            tabIndex={0}
          />
        </label>
      </div>
    )
  }

  // Rich text: delegate to parent renderer
  if (type === 'richtext') {
    return (
      <div style={{ ...containerStyle, flexDirection: 'column', gap: '4px', alignItems: 'stretch' }}>
        <span style={{ ...labelStyle, width: 'auto', paddingTop: 0, marginBottom: '2px' }}>{label}</span>
        {renderRichText
          ? renderRichText(String(value ?? ''), (html) => onChange(html))
          : (
            <textarea
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
              value={String(value ?? '')}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
            />
          )}
      </div>
    )
  }

  // URL: display as clickable link
  if (type === 'url' && !editing) {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>{label}</span>
        {value ? (
          <a
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...displayStyle, color: 'var(--accent, #6366f1)', textDecoration: 'underline' }}
            onClick={(e) => e.stopPropagation()}
          >
            {String(value)}
          </a>
        ) : (
          <span style={displayStyle} onClick={enterEdit}>
            {placeholder ?? '—'}
          </span>
        )}
        <button
          onClick={enterEdit}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '11px', padding: '2px' }}
        >
          Edit
        </button>
      </div>
    )
  }

  // Email: display as clickable mailto
  if (type === 'email' && !editing) {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>{label}</span>
        {value ? (
          <a
            href={`mailto:${String(value)}`}
            style={{ ...displayStyle, color: 'var(--accent, #6366f1)', textDecoration: 'underline' }}
            onClick={(e) => e.stopPropagation()}
          >
            {String(value)}
          </a>
        ) : (
          <span style={displayStyle} onClick={enterEdit}>
            {placeholder ?? '—'}
          </span>
        )}
        <button
          onClick={enterEdit}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '11px', padding: '2px' }}
        >
          Edit
        </button>
      </div>
    )
  }

  // Priority: colored badge dropdown
  if (type === 'priority') {
    if (!editing) {
      const priorityVal = String(value ?? 'media')
      return (
        <div style={containerStyle}>
          <span style={labelStyle}>{label}</span>
          <span
            onClick={enterEdit}
            style={{
              ...displayStyle,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: priorityColors[priorityVal] ?? 'var(--text-muted)',
              }}
            />
            <span style={{ color: priorityColors[priorityVal] ?? 'var(--text-primary)', fontWeight: 500 }}>
              {priorityVal}
            </span>
          </span>
        </div>
      )
    }
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>{label}</span>
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={String(draft ?? 'media')}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commitEdit(draft)}
          onKeyDown={handleKeyDown}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {['baja', 'media', 'alta'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
    )
  }

  // Labels: chips + input
  if (type === 'labels') {
    const currentLabels: string[] = Array.isArray(value) ? (value as string[]) : []

    const addLabel = () => {
      const trimmed = labelInput.trim()
      if (trimmed && !currentLabels.includes(trimmed)) {
        const next = [...currentLabels, trimmed]
        onChange(next)
        setLabelInput('')
      }
    }

    const removeLabel = (label: string) => {
      onChange(currentLabels.filter((l) => l !== label))
    }

    return (
      <div style={{ ...containerStyle, flexWrap: 'wrap' }}>
        <span style={labelStyle}>{label}</span>
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
          {currentLabels.map((l) => (
            <span
              key={l}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '1px 6px',
                fontSize: '11px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {l}
              <button
                onClick={() => removeLabel(l)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  padding: '0',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addLabel() }
            }}
            placeholder={currentLabels.length === 0 ? (placeholder ?? 'Add label...') : '+ label'}
            style={{
              ...inputStyle,
              flex: '0 0 auto',
              width: '100px',
              border: 'none',
              background: 'transparent',
              padding: '2px 4px',
              fontSize: '12px',
            }}
            tabIndex={0}
          />
        </div>
      </div>
    )
  }

  // Multi-select: chips + dropdown
  if (type === 'multi_select') {
    const selected: string[] = Array.isArray(value) ? (value as string[]) : []
    const toggle = (opt: string) => {
      const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]
      onChange(next)
    }

    return (
      <div style={containerStyle}>
        <span style={labelStyle}>{label}</span>
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {selected.map((s) => (
            <span
              key={s}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                background: 'var(--accent, #6366f1)',
                color: '#fff',
                borderRadius: '10px',
                padding: '1px 8px',
                fontSize: '11px',
                fontFamily: 'var(--font-body)',
              }}
            >
              {s}
              <button
                onClick={() => toggle(s)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '12px', padding: 0, lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
          {options.filter((o) => !selected.includes(o)).length > 0 && (
            <div style={{ position: 'relative' }}>
              <select
                style={{ ...inputStyle, fontSize: '11px', padding: '1px 4px' }}
                value=""
                onChange={(e) => { if (e.target.value) toggle(e.target.value) }}
              >
                <option value="">+ Add</option>
                {options.filter((o) => !selected.includes(o)).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Select
  if (type === 'select') {
    if (!editing) {
      return (
        <div style={containerStyle}>
          <span style={labelStyle}>{label}</span>
          <span style={displayStyle} onClick={enterEdit}>
            {value ? String(value) : (placeholder ?? '—')}
          </span>
        </div>
      )
    }
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>{label}</span>
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={String(draft ?? '')}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commitEdit(draft)}
          onKeyDown={handleKeyDown}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">— {placeholder ?? 'Select'} —</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
    )
  }

  // Textarea
  if (type === 'textarea') {
    if (!editing) {
      return (
        <div style={{ ...containerStyle, flexDirection: 'column', gap: '4px', alignItems: 'stretch' }}>
          <span style={{ ...labelStyle, width: 'auto', paddingTop: 0 }}>{label}</span>
          <div
            style={{
              ...displayStyle,
              whiteSpace: 'pre-wrap',
              minHeight: '60px',
              background: value ? 'transparent' : 'var(--surface)',
              border: value ? 'none' : '1px dashed var(--border)',
              borderRadius: '4px',
              padding: '6px 8px',
            }}
            onClick={enterEdit}
          >
            {value ? String(value) : (placeholder ?? 'Click to add...')}
          </div>
        </div>
      )
    }
    return (
      <div style={{ ...containerStyle, flexDirection: 'column', gap: '4px', alignItems: 'stretch' }}>
        <span style={{ ...labelStyle, width: 'auto', paddingTop: 0 }}>{label}</span>
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={String(draft ?? '')}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commitEdit(draft)}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); cancelEdit() } }}
          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
          placeholder={placeholder}
          tabIndex={0}
        />
      </div>
    )
  }

  // Default: text, number, date, url (edit mode), email (edit mode)
  const inputType = type === 'date' ? 'date' : type === 'number' ? 'number' : type === 'url' ? 'url' : type === 'email' ? 'email' : 'text'

  if (!editing) {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>{label}</span>
        <span style={displayStyle} onClick={enterEdit} tabIndex={0} onFocus={enterEdit}>
          {value !== null && value !== undefined && value !== '' ? String(value) : (placeholder ?? '—')}
        </span>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <span style={labelStyle}>{label}</span>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={inputType}
        value={String(draft ?? '')}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commitEdit(draft)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={inputStyle}
        tabIndex={0}
      />
    </div>
  )
}
