'use client'

import type { CardRow, Priority } from '@/types/workflow'
import { PriorityBadge } from '@/components/atoms/PriorityBadge'

interface KanbanCardProps {
  card: CardRow
  onDragStart: (e: React.DragEvent<HTMLDivElement>, card: CardRow) => void
  onCardClick: (cardId: string) => void
  isNew?: boolean
}

const PRIORITY_LEFT_BORDER: Record<Priority, string> = {
  critica: '#ef4444',
  alta:    '#f97316',
  media:   '#eab308',
  baja:    'var(--border-primary)',
}

const MAX_VISIBLE_LABELS = 3

function isDueOverdue(dueDate: string): boolean {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(dueDate) < today
}

function isDueToday(dueDate: string): boolean {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
  return due.getTime() === today.getTime()
}

function formatDueDate(dueDate: string): string {
  const d = new Date(dueDate)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function KanbanCard({ card, onDragStart, onCardClick, isNew = false }: KanbanCardProps) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('card_id', card.card_id)
    e.dataTransfer.setData('source_state_id', card.state_id)
    onDragStart(e, card)
  }

  const handlePriorityChange = async (newPriority: Priority) => {
    try {
      await fetch(`/api/cards/${card.card_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })
      // Board page will receive realtime update — no local state needed
    } catch {
      // silent — board will revert on next realtime sync
    }
  }

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onClick={() => onCardClick(card.card_id)}
      style={{
        background: 'var(--bg-secondary)',
        border: "1px solid var(--border-primary)",
        borderLeft: `3px solid ${PRIORITY_LEFT_BORDER[card.priority]}`,
        borderRadius: 'var(--radius-md, 8px)',
        padding: '10px 12px',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: '0 1px 2px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.06)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        opacity: isNew ? 0 : 1,
        animation: isNew ? 'fadeIn 0.3s ease forwards' : undefined,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 4px 12px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.08)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = '0 1px 2px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.06)'
      }}
    >
      {/* Row 1 — Priority badge + code */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <PriorityBadge
          priority={card.priority}
          editable={true}
          onChange={handlePriorityChange}
        />
        {card.code && (
          <span style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '10px',
            fontWeight: 700,
            color: "var(--text-quaternary-500)",
          }}>
            {card.code}
          </span>
        )}
      </div>

      {/* Row 2 — Title */}
      <p style={{
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        fontSize: '13px',
        fontWeight: 500,
        color: "var(--text-primary-900)",
        margin: '0 0 6px 0',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        lineHeight: '1.4',
      }}>
        {card.title}
      </p>

      {/* Row 3 — Labels (hidden if empty) */}
      {card.labels.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
          {card.labels.slice(0, MAX_VISIBLE_LABELS).map((label) => (
            <span key={label} style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.4px',
              color: "var(--text-tertiary-600)",
              background: 'rgba(82,82,82,0.12)',
              border: "1px solid var(--border-primary)",
              borderRadius: '4px',
              padding: '2px 6px',
              maxWidth: '80px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' as const,
            }}>
              {label}
            </span>
          ))}
          {card.labels.length > MAX_VISIBLE_LABELS && (
            <span style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '10px', color: "var(--text-tertiary-600)" }}>
              +{card.labels.length - MAX_VISIBLE_LABELS}
            </span>
          )}
        </div>
      )}

      {/* Row 4 — Assignee + Due date (hidden if both null) */}
      {(card.assigned_agent_id || card.due_date) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
          {/* Assignee — initial avatar circle */}
          {card.assigned_agent_id && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'var(--bg-tertiary)',
                border: "1px solid var(--border-primary)",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '8px', fontWeight: 700, color: "var(--text-tertiary-600)" }}>
                  {card.assigned_agent_id.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
          {/* Due date */}
          {card.due_date && (
            <span style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '10px',
              fontWeight: 500,
              color: isDueOverdue(card.due_date)
                ? 'var(--error-500)'
                : isDueToday(card.due_date)
                  ? 'var(--warning-500)'
                  : 'var(--text-quaternary-500)',
              marginLeft: 'auto',
            }}>
              {formatDueDate(card.due_date)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
