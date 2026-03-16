'use client'

import { useState } from 'react'
import type { BoardColumnRow, CardRow, CardType } from '@/types/workflow'
import { KanbanCard } from './KanbanCard'
import { InlineCardCreate } from './InlineCardCreate'

interface KanbanColumnProps {
  column: BoardColumnRow & { state_ids: string[] }
  cards: CardRow[]
  workflowId: string
  defaultCardType: CardType
  onDropCard: (cardId: string, targetColumn: BoardColumnRow & { state_ids: string[] }) => void
  onCardClick: (cardId: string) => void
  onCardCreated: (card: CardRow) => void
  newCardIds?: Set<string>
}

export function KanbanColumn({
  column,
  cards,
  workflowId,
  defaultCardType,
  onDropCard,
  onCardClick,
  onCardCreated,
  newCardIds,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [showInlineCreate, setShowInlineCreate] = useState(false)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the column entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const cardId = e.dataTransfer.getData('card_id')
    if (cardId) {
      onDropCard(cardId, column)
    }
  }

  // Sort cards by sort_order (lexicographic on the fractional index string)
  const sortedCards = [...cards].sort((a, b) => {
    if (a.sort_order < b.sort_order) return -1
    if (a.sort_order > b.sort_order) return 1
    return 0
  })

  // First state_id is the default for new cards created in this column
  const defaultStateId = column.state_ids[0] ?? ''

  const handleCardCreated = (card: CardRow) => {
    onCardCreated(card)
    // Keep inline create open for another card
  }

  const handleCancelInlineCreate = () => {
    setShowInlineCreate(false)
  }

  return (
    <div
      style={{
        width: '280px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 200px)',
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          marginBottom: '8px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {column.name}
          </span>
          {/* Only-humans lock icon */}
          {column.only_humans && (
            <span
              title="Human-only column"
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                opacity: 0.7,
              }}
            >
              &#128274;
            </span>
          )}
          {/* Card count badge */}
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'var(--surface-alt, rgba(255,255,255,0.06))',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '1px 6px',
              minWidth: '20px',
              textAlign: 'center',
            }}
          >
            {cards.length}
          </span>
        </div>

        {/* Add card button */}
        <button
          onClick={() => setShowInlineCreate((v) => !v)}
          title="Add card"
          style={{
            background: showInlineCreate
              ? 'var(--surface-alt, rgba(255,255,255,0.08))'
              : 'none',
            border: 'none',
            cursor: 'pointer',
            color: showInlineCreate ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '18px',
            lineHeight: 1,
            padding: '0 2px',
            borderRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'var(--surface-alt, rgba(255,255,255,0.08))'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = showInlineCreate
              ? 'var(--surface-alt, rgba(255,255,255,0.08))'
              : 'none'
            ;(e.currentTarget as HTMLButtonElement).style.color = showInlineCreate
              ? 'var(--text-primary)'
              : 'var(--text-secondary)'
          }}
        >
          +
        </button>
      </div>

      {/* Cards drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '4px',
          borderRadius: '6px',
          border: isDragOver ? '2px dashed var(--accent, #6366f1)' : '2px dashed transparent',
          background: isDragOver ? 'rgba(99,102,241,0.04)' : 'transparent',
          transition: 'border-color 0.15s ease, background 0.15s ease',
          minHeight: '80px',
        }}
      >
        {sortedCards.map((card) => (
          <KanbanCard
            key={card.card_id}
            card={card}
            onDragStart={(e, dragCard) => {
              // Column can observe drag start if needed; card handles dataTransfer internally
              void dragCard
              void e
            }}
            onCardClick={onCardClick}
            isNew={newCardIds?.has(card.card_id)}
          />
        ))}
        {sortedCards.length === 0 && !showInlineCreate && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              opacity: 0.5,
              minHeight: '60px',
            }}
          >
            Drop here
          </div>
        )}

        {/* Inline card create — shown at bottom of column */}
        {showInlineCreate && (
          <InlineCardCreate
            workflowId={workflowId}
            stateId={defaultStateId}
            defaultCardType={defaultCardType}
            onCardCreated={handleCardCreated}
            onCancel={handleCancelInlineCreate}
          />
        )}
      </div>
    </div>
  )
}
