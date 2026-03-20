'use client'

import { useState } from 'react'
import type { BoardWithColumns, CardRow, BoardColumnRow, CardType } from '@/types/workflow'
import { KanbanColumn } from './KanbanColumn'
import { CsvImportDialog } from './CsvImportDialog'

interface BoardKanbanProps {
  board: BoardWithColumns
  cards: CardRow[]
  filteredCards?: CardRow[] | null
  onMoveCard: (cardId: string, newStateId: string) => void
  onReorderCard: (cardId: string, newSortOrder: string) => void
  onCardClick: (cardId: string) => void
  onCardCreated?: (card: CardRow) => void
  onImportComplete?: () => void
  newCardIds?: Set<string>
}

export function BoardKanban({
  board,
  cards,
  filteredCards,
  onMoveCard,
  onReorderCard,
  onCardClick,
  onCardCreated,
  onImportComplete,
  newCardIds,
}: BoardKanbanProps) {
  const [showCsvImport, setShowCsvImport] = useState(false)

  // Use filtered cards when provided, otherwise use all cards
  const displayCards = filteredCards ?? cards

  // Group cards by state_id
  const cardsByStateId = displayCards.reduce<Record<string, CardRow[]>>((acc, card) => {
    if (!acc[card.state_id]) acc[card.state_id] = []
    acc[card.state_id].push(card)
    return acc
  }, {})

  // For each column, collect cards whose state_id is in column.state_ids
  const getColumnCards = (column: BoardColumnRow & { state_ids: string[] }): CardRow[] => {
    const result: CardRow[] = []
    for (const stateId of column.state_ids) {
      const stateCards = cardsByStateId[stateId] ?? []
      result.push(...stateCards)
    }
    return result
  }

  const handleDropCard = (
    cardId: string,
    targetColumn: BoardColumnRow & { state_ids: string[] }
  ) => {
    // Find the card from all cards (not filtered) to avoid losing it on move
    const card = cards.find((c) => c.card_id === cardId)
    if (!card) return

    const isCrossColumn = !targetColumn.state_ids.includes(card.state_id)

    if (isCrossColumn) {
      // Move to first state in target column
      const newStateId = targetColumn.state_ids[0]
      if (newStateId) {
        onMoveCard(cardId, newStateId)
      }
    } else {
      // Reorder within column — append to end by generating a new sort_order
      const columnCards = getColumnCards(targetColumn)
      const lastCard = columnCards[columnCards.length - 1]
      const newSortOrder =
        lastCard && lastCard.card_id !== cardId
          ? lastCard.sort_order + 'm' // append 'm' to place after last card
          : card.sort_order // no change if already last or only card
      onReorderCard(cardId, newSortOrder)
    }
  }

  const handleCardCreated = (card: CardRow) => {
    onCardCreated?.(card)
  }

  // Default card type: board's card_type_filter or 'story'
  const defaultCardType: CardType = board.card_type_filter ?? 'story'

  // First column's first state_id for CSV import default
  const firstColumn = board.columns[0]
  const csvDefaultStateId = firstColumn?.state_ids[0] ?? ''

  return (
    <div className="flex flex-col gap-0">
      {/* Toolbar: Import CSV button */}
      <div className="flex justify-end items-center mb-2 px-6 gap-2">
        <button
          onClick={() => setShowCsvImport(true)}
          className="font-body text-xs bg-transparent border border-secondary rounded-md text-secondary px-3 py-1 cursor-pointer flex items-center gap-[5px] hover:text-primary"
        >
          &#8679; Import CSV
        </button>
      </div>

      {/* Kanban columns */}
      <div className="flex flex-row gap-3 overflow-x-auto overflow-y-visible px-6 pb-3 pt-1 items-start">
        {board.columns.map((column) => (
          <KanbanColumn
            key={column.column_id}
            column={column}
            cards={getColumnCards(column)}
            workflowId={board.workflow_id}
            defaultCardType={defaultCardType}
            onDropCard={handleDropCard}
            onCardClick={onCardClick}
            onCardCreated={handleCardCreated}
            newCardIds={newCardIds}
          />
        ))}
      </div>

      {/* CSV Import Dialog */}
      {showCsvImport && (
        <CsvImportDialog
          boardId={board.board_id}
          workflowId={board.workflow_id}
          stateId={csvDefaultStateId}
          defaultCardType={defaultCardType}
          onImportComplete={() => {
            onImportComplete?.()
          }}
          onClose={() => setShowCsvImport(false)}
        />
      )}
    </div>
  )
}
