'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { CardRow, CardType } from '@/types/workflow'

interface ChildEntry {
  card_id: string
  title: string
  card_type: CardType
  state_id: string
}

interface CardChildTasksProps {
  children: ChildEntry[]
  parentCardId: string
  parentCardType: CardType
  workflowId: string
  stateId: string
  cardCodeMap?: Record<string, string>
  onNavigateToCard: (cardId: string) => void
  onChildCreated: () => void
}

const cardTypeBadgeColors: Record<string, { bg: string; text: string }> = {
  epic: { bg: '#7c3aed', text: '#fff' },
  story: { bg: '#16a34a', text: '#fff' },
  task: { bg: '#2563eb', text: '#fff' },
  subtask: { bg: '#6b7280', text: '#fff' },
  bug: { bg: '#dc2626', text: '#fff' },
}

function getAllowedChildTypes(parentType: CardType): CardType[] {
  switch (parentType) {
    case 'epic':
      return ['story', 'task', 'bug']
    case 'story':
      return ['task', 'subtask', 'bug']
    case 'task':
      return ['subtask']
    default:
      return ['subtask']
  }
}

export function CardChildTasks({
  children,
  parentCardId,
  parentCardType,
  workflowId,
  stateId,
  cardCodeMap = {},
  onNavigateToCard,
  onChildCreated,
}: CardChildTasksProps) {
  const [expanded, setExpanded] = useState(true)
  const [showInput, setShowInput] = useState(false)
  const [inputText, setInputText] = useState('')
  const [newType, setNewType] = useState<CardType>('subtask')
  const [creating, setCreating] = useState(false)
  const [searchResults, setSearchResults] = useState<CardRow[]>([])
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const allowedTypes = getAllowedChildTypes(parentCardType)

  // Focus input when opened
  useEffect(() => {
    if (showInput) {
      setTimeout(() => inputRef.current?.focus(), 50)
      if (!allowedTypes.includes(newType)) {
        setNewType(allowedTypes[0] ?? 'subtask')
      }
    }
  }, [showInput]) // eslint-disable-line react-hooks/exhaustive-deps

  // Unified search: when user types, search existing cards
  useEffect(() => {
    if (!showInput || !inputText.trim()) {
      setSearchResults([])
      return
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/cards?workflow_id=${workflowId}&search=${encodeURIComponent(inputText.trim())}&limit=8`
        )
        if (res.ok) {
          const page = await res.json()
          const results = (page.data ?? []) as CardRow[]
          const childIds = new Set(children.map((c) => c.card_id))
          setSearchResults(
            results.filter(
              (r) => r.card_id !== parentCardId && !childIds.has(r.card_id)
            )
          )
        }
      } catch {
        // silent
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [inputText, showInput, workflowId, parentCardId, children])

  const handleCreate = async () => {
    const title = inputText.trim()
    if (!title || creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          workflow_id: workflowId,
          state_id: stateId,
          card_type: newType,
          parent_card_id: parentCardId,
        }),
      })
      if (res.ok) {
        setInputText('')
        setSearchResults([])
        onChildCreated()
        // Keep input open for rapid creation
      } else {
        const err = await res.json().catch(() => ({}))
        console.error('[CardChildTasks] create error:', err)
      }
    } catch (err) {
      console.error('[CardChildTasks] create error:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleLink = async (cardId: string) => {
    setLinking(cardId)
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_card_id: parentCardId }),
      })
      if (res.ok) {
        setInputText('')
        setSearchResults([])
        onChildCreated()
      } else {
        const err = await res.json().catch(() => ({}))
        console.error('[CardChildTasks] link error:', err)
      }
    } catch (err) {
      console.error('[CardChildTasks] link error:', err)
    } finally {
      setLinking(null)
    }
  }

  const closeInput = () => {
    setShowInput(false)
    setInputText('')
    setSearchResults([])
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    fontSize: '11px',
    fontWeight: 600,
    color: "var(--text-quaternary-500)",
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            ...labelStyle,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          Child tasks {children.length > 0 && `(${children.length})`}
        </button>

        {expanded && !showInput && (
          <button
            onClick={() => setShowInput(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              background: 'none',
              border: "1px solid var(--border-primary)",
              borderRadius: '4px',
              padding: '2px 6px',
              cursor: 'pointer',
              color: "var(--text-tertiary-600)",
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '11px',
            }}
            title="Add child task"
          >
            <Plus size={11} />
            Add
          </button>
        )}
      </div>

      {expanded && (
        <>
          {/* Children list */}
          {children.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: showInput ? '8px' : 0 }}>
              {children.map((child) => {
                const colors = cardTypeBadgeColors[child.card_type] ?? { bg: '#6b7280', text: '#fff' }
                const code = cardCodeMap[child.card_id]
                return (
                  <button
                    key={child.card_id}
                    onClick={() => onNavigateToCard(child.card_id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'none',
                      border: 'none',
                      padding: '3px 0',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '12px',
                      color: "var(--text-tertiary-600)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary-900)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary-600)' }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        background: colors.bg,
                        color: colors.text,
                        borderRadius: '3px',
                        padding: '1px 5px',
                        fontSize: '9px',
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      {child.card_type}
                    </span>
                    {code && (
                      <span style={{ fontSize: '10px', color: 'var(--brand-600)', fontWeight: 600, flexShrink: 0 }}>
                        {code}
                      </span>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {child.title}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* No children message (only when input is closed) */}
          {children.length === 0 && !showInput && (
            <p style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '12px', color: "var(--text-quaternary-500)", margin: 0, padding: '4px 0' }}>
              No child tasks
            </p>
          )}

          {/* Unified add input */}
          {showInput && (
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: "1px solid var(--border-primary)",
                borderRadius: '6px',
                padding: '8px 10px',
              }}
            >
              {/* Input row: type selector + text input + close */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as CardType)}
                  style={{
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: '11px',
                    background: 'var(--bg-tertiary)',
                    border: "1px solid var(--border-primary)",
                    borderRadius: '4px',
                    padding: '4px 6px',
                    color: "var(--text-primary-900)",
                    cursor: 'pointer',
                    outline: 'none',
                    width: '82px',
                    flexShrink: 0,
                  }}
                >
                  {allowedTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputText.trim()) handleCreate()
                    if (e.key === 'Escape') closeInput()
                  }}
                  placeholder="Search or create..."
                  style={{
                    flex: 1,
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: '12px',
                    background: 'var(--bg-tertiary)',
                    border: "1px solid var(--border-primary)",
                    borderRadius: '4px',
                    padding: '4px 8px',
                    color: "var(--text-primary-900)",
                    outline: 'none',
                    minWidth: 0,
                  }}
                />
                <button
                  onClick={closeInput}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: "var(--text-quaternary-500)", padding: '2px', flexShrink: 0 }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Dropdown: search results + create option */}
              {inputText.trim() && (
                <div
                  style={{
                    marginTop: '6px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1px',
                  }}
                >
                  {/* Existing cards matching search */}
                  {searching && (
                    <div style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '11px', color: "var(--text-quaternary-500)", padding: '4px 6px' }}>
                      Searching...
                    </div>
                  )}
                  {!searching && searchResults.map((r) => {
                    const colors = cardTypeBadgeColors[r.card_type] ?? { bg: '#6b7280', text: '#fff' }
                    const code = r.code || cardCodeMap[r.card_id]
                    return (
                      <button
                        key={r.card_id}
                        onClick={() => handleLink(r.card_id)}
                        disabled={linking === r.card_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'none',
                          border: '1px solid transparent',
                          borderRadius: '4px',
                          padding: '5px 6px',
                          cursor: linking === r.card_id ? 'wait' : 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          fontSize: '12px',
                          color: "var(--text-tertiary-600)",
                          opacity: linking === r.card_id ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            background: colors.bg,
                            color: colors.text,
                            borderRadius: '3px',
                            padding: '1px 5px',
                            fontSize: '9px',
                            fontWeight: 500,
                            flexShrink: 0,
                          }}
                        >
                          {r.card_type}
                        </span>
                        {code && (
                          <span style={{ fontSize: '10px', color: "var(--text-quaternary-500)", fontWeight: 600, flexShrink: 0 }}>
                            {code}
                          </span>
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {r.title}
                        </span>
                      </button>
                    )
                  })}

                  {/* Separator if there are results */}
                  {!searching && searchResults.length > 0 && (
                    <div style={{ borderTop: "1px solid var(--border-primary)", margin: '4px 0' }} />
                  )}

                  {/* Always show "Create" option at bottom */}
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'none',
                      border: '1px solid transparent',
                      borderRadius: '4px',
                      padding: '5px 6px',
                      cursor: creating ? 'wait' : 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '12px',
                      color: 'var(--brand-600)',
                      opacity: creating ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                  >
                    <Plus size={13} style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 500 }}>
                      {creating ? 'Creating...' : `Create "${inputText.trim()}"`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
