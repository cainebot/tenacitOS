'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface AgentOption {
  agent_id: string
  name: string | null
  emoji: string | null
  status: string | null
}

interface MentionInputProps {
  value: string
  onChange: (text: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
  rows?: number
}

// Static "user" entry representing Joan (the human operator)
const USER_ENTRY: AgentOption = {
  agent_id: 'user',
  name: 'Joan',
  emoji: '',
  status: 'online',
}

interface MentionQuery {
  query: string
  startIndex: number // index of the '@' in the text
}

function detectMentionQuery(text: string, cursorPos: number): MentionQuery | null {
  // Walk backwards from cursor to find '@'
  let i = cursorPos - 1
  while (i >= 0) {
    const ch = text[i]
    if (ch === '@') {
      const query = text.slice(i + 1, cursorPos)
      // Only trigger if query contains only word chars / hyphens (no spaces)
      if (/^[\w-]*$/.test(query)) {
        return { query, startIndex: i }
      }
      return null
    }
    // If we hit a space or newline, no active mention
    if (ch === ' ' || ch === '\n') return null
    i--
  }
  return null
}

export function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  rows = 3,
}: MentionInputProps) {
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [mentionQuery, setMentionQuery] = useState<MentionQuery | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch agents on mount
  useEffect(() => {
    fetch('/api/agents/list')
      .then((res) => res.json())
      .then((data: AgentOption[]) => {
        setAgents([...data, USER_ENTRY])
      })
      .catch(() => {
        setAgents([USER_ENTRY])
      })
  }, [])

  // Filter agents by current query
  const filteredAgents = mentionQuery
    ? agents.filter((a) => {
        const q = mentionQuery.query.toLowerCase()
        if (!q) return true
        const idMatch = a.agent_id.toLowerCase().includes(q)
        const nameMatch = (a.name ?? '').toLowerCase().includes(q)
        return idMatch || nameMatch
      })
    : []

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    const cursor = e.target.selectionStart ?? newText.length
    onChange(newText)

    const query = detectMentionQuery(newText, cursor)
    setMentionQuery(query)
    setSelectedIndex(0)
  }

  const insertMention = useCallback(
    (agent: AgentOption) => {
      if (!mentionQuery || !textareaRef.current) return

      const before = value.slice(0, mentionQuery.startIndex)
      const after = value.slice(mentionQuery.startIndex + 1 + mentionQuery.query.length)
      const inserted = `@${agent.agent_id} `
      const newText = before + inserted + after
      onChange(newText)
      setMentionQuery(null)

      // Restore cursor position after insertion
      const newCursor = before.length + inserted.length
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newCursor, newCursor)
        }
      })
    },
    [mentionQuery, value, onChange],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery && filteredAgents.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filteredAgents.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        insertMention(filteredAgents[selectedIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionQuery(null)
        return
      }
    } else {
      // No dropdown — Enter submits, Shift+Enter is newline
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onSubmit()
      }
    }
  }

  // Close dropdown when cursor moves away from mention region
  const handleSelect = () => {
    if (!textareaRef.current) return
    const cursor = textareaRef.current.selectionStart ?? 0
    const query = detectMentionQuery(value, cursor)
    if (!query) {
      setMentionQuery(null)
    } else {
      setMentionQuery(query)
      setSelectedIndex(0)
    }
  }

  const showDropdown = mentionQuery !== null && filteredAgents.length > 0

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        style={{
          width: '100%',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontSize: '13px',
          background: 'var(--bg-secondary)',
          color: "var(--text-primary-900)",
          border: '1px solid var(--border, #333)',
          borderRadius: '6px',
          padding: '8px 10px',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {showDropdown && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            marginBottom: '4px',
            background: 'var(--bg-tertiary)',
            border: "1px solid var(--border-primary)",
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 50,
          }}
        >
          {filteredAgents.map((agent, idx) => {
            const displayName = agent.name ?? agent.agent_id
            const isActive = idx === selectedIndex
            return (
              <div
                key={agent.agent_id}
                onMouseDown={(e) => {
                  // Use mousedown so blur doesn't close dropdown before click
                  e.preventDefault()
                  insertMention(agent)
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  background: isActive ? 'var(--brand-600)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text-primary-900)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {agent.emoji && (
                  <span style={{ fontSize: '14px' }}>{agent.emoji}</span>
                )}
                <span>{displayName}</span>
                <span
                  style={{
                    fontSize: '11px',
                    opacity: 0.6,
                    color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-tertiary-600)',
                  }}
                >
                  @{agent.agent_id}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
