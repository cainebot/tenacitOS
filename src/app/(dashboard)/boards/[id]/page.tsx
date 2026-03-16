'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { BoardRow, CardRow, WorkflowStateRow } from '@/types/workflow'
import { useBoardData } from '@/hooks/useBoardData'
import { useRealtimeCards } from '@/hooks/useRealtimeCards'
import { BoardKanban } from '@/components/BoardKanban'
import { BoardFilterBar } from '@/components/BoardFilterBar'
import { CardDetailPanel } from '@/components/CardDetailPanel'
import { ColumnManager } from '@/components/ColumnManager'

// Loading skeleton for the Kanban board
function KanbanSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        padding: '4px 0 12px 0',
      }}
    >
      {[1, 2, 3].map((col) => (
        <div
          key={col}
          style={{
            width: '280px',
            flexShrink: 0,
          }}
        >
          {/* Column header skeleton */}
          <div
            style={{
              height: '38px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              marginBottom: '8px',
              opacity: 0.5,
            }}
          />
          {/* Card skeletons */}
          {[1, 2, 3, 4].map((card) => (
            <div
              key={card}
              style={{
                height: `${48 + card * 8}px`,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                marginBottom: '8px',
                opacity: 0.4,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function BoardPage() {
  const params = useParams()
  const boardId = params.id as string

  const { board, cards: initialCards, loading, error, refetch } = useBoardData(boardId)

  // Local cards state for optimistic updates
  const [cards, setCards] = useState<CardRow[]>([])
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set())

  // Filtered cards state — null means "no filter active, show all"
  const [filteredCards, setFilteredCards] = useState<CardRow[] | null>(null)

  // Selected card for detail panel
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  // Column manager visibility
  const [showColumnManager, setShowColumnManager] = useState(false)

  // Workflow states (for ColumnManager state mapping)
  const [workflowStates, setWorkflowStates] = useState<WorkflowStateRow[]>([])

  // All boards for the tab bar
  const [allBoards, setAllBoards] = useState<BoardRow[]>([])

  // Track previous card IDs to detect new cards from realtime
  const prevCardIdsRef = useRef<Set<string>>(new Set())

  // Sync local cards with data from hook
  useEffect(() => {
    setCards(initialCards)
    prevCardIdsRef.current = new Set(initialCards.map((c) => c.card_id))
  }, [initialCards])

  // Fetch workflow states when board loads (needed for ColumnManager state mapping)
  useEffect(() => {
    if (board?.workflow_id) {
      fetch(`/api/workflows/${board.workflow_id}/states`)
        .then((res) => (res.ok ? res.json() : []))
        .then((states: WorkflowStateRow[]) => setWorkflowStates(states))
        .catch(() => {}) // non-critical — ColumnManager degrades gracefully
    }
  }, [board?.workflow_id])

  // Fetch all boards for the tab bar
  useEffect(() => {
    fetch('/api/boards')
      .then((res) => res.json())
      .then((data: BoardRow[]) => setAllBoards(data))
      .catch(() => {}) // non-critical
  }, [])

  // Handle realtime card changes — refetch on any change, then mark new cards
  const handleCardChange = useCallback(async () => {
    await refetch()
    // After refetch, detect new cards and animate them
    // (done via useEffect on initialCards above + the newCardIds state)
  }, [refetch])

  // After refetch completes, find and animate new cards
  useEffect(() => {
    const currentIds = new Set(initialCards.map((c) => c.card_id))
    const incoming = new Set<string>()
    for (const id of currentIds) {
      if (!prevCardIdsRef.current.has(id)) {
        incoming.add(id)
      }
    }
    if (incoming.size > 0) {
      setNewCardIds(incoming)
      // Clear "new" flag after animation completes
      const timer = setTimeout(() => setNewCardIds(new Set()), 600)
      return () => clearTimeout(timer)
    }
  }, [initialCards])

  useRealtimeCards(boardId, handleCardChange)

  // Move card: optimistic update + API call
  const handleMoveCard = useCallback(
    async (cardId: string, newStateId: string) => {
      // Optimistic update
      setCards((prev) =>
        prev.map((c) => (c.card_id === cardId ? { ...c, state_id: newStateId } : c))
      )

      try {
        const res = await fetch(`/api/cards/${cardId}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state_id: newStateId, moved_by: 'user' }),
        })
        if (!res.ok) {
          throw new Error(`Move failed: ${res.statusText}`)
        }
      } catch (err) {
        console.error('Failed to move card:', err)
        // Revert: refetch to get actual state
        await refetch()
      }
    },
    [refetch]
  )

  // Reorder card: optimistic update + API call
  const handleReorderCard = useCallback(
    async (cardId: string, newSortOrder: string) => {
      // Optimistic update
      setCards((prev) =>
        prev.map((c) => (c.card_id === cardId ? { ...c, sort_order: newSortOrder } : c))
      )

      try {
        const res = await fetch(`/api/cards/${cardId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: newSortOrder }),
        })
        if (!res.ok) {
          throw new Error(`Reorder failed: ${res.statusText}`)
        }
      } catch (err) {
        console.error('Failed to reorder card:', err)
        await refetch()
      }
    },
    [refetch]
  )

  // Card click: open detail panel
  const handleCardClick = useCallback((cardId: string) => {
    setSelectedCardId(cardId)
  }, [])

  // Card created inline: add to local state + trigger refetch for Realtime consistency
  const handleCardCreated = useCallback(
    async (card: CardRow) => {
      setCards((prev) => [...prev, card])
      setNewCardIds((prev) => new Set([...prev, card.card_id]))
      // Animate new card indicator briefly
      setTimeout(() => {
        setNewCardIds((prev) => {
          const next = new Set(prev)
          next.delete(card.card_id)
          return next
        })
      }, 600)
      // Refetch to sync any server-side changes
      await refetch()
    },
    [refetch]
  )

  // Import complete: refetch board data
  const handleImportComplete = useCallback(async () => {
    await refetch()
  }, [refetch])

  // Handle filter changes from BoardFilterBar
  const handleFilterChange = useCallback((filtered: CardRow[]) => {
    // If filtered count == total cards, treat as no filter (avoids stale reference issues)
    setFilteredCards(filtered)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Multi-board tab bar */}
      {allBoards.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '0',
            overflowX: 'auto',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '0',
          }}
        >
          {allBoards.map((b) => {
            const isActive = b.board_id === boardId
            return (
              <Link
                key={b.board_id}
                href={`/boards/${b.board_id}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    padding: '8px 16px',
                    borderBottom: isActive
                      ? '2px solid var(--accent, #6366f1)'
                      : '2px solid transparent',
                    marginBottom: '-1px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      ;(e.currentTarget as HTMLDivElement).style.color = 'var(--text-primary)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      ;(e.currentTarget as HTMLDivElement).style.color = 'var(--text-secondary)'
                    }
                  }}
                >
                  {b.name}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Board title + toolbar */}
      {board && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '12px 0 8px 0',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              flex: 1,
            }}
          >
            {board.name}
          </h1>
          {/* Manage Columns button */}
          <button
            onClick={() => setShowColumnManager(true)}
            title="Manage Columns"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '4px 10px',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.1s ease, color 0.1s ease',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'var(--surface-alt, rgba(255,255,255,0.06))'
              el.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'none'
              el.style.color = 'var(--text-secondary)'
            }}
          >
            {/* Settings icon */}
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Manage Columns
          </button>
        </div>
      )}

      {/* Filter bar — always visible when board is loaded */}
      {!loading && !error && board && (
        <BoardFilterBar
          boardId={boardId}
          cards={cards}
          agents={[]}
          onFilterChange={handleFilterChange}
        />
      )}

      {/* Loading skeleton */}
      {loading && <KanbanSkeleton />}

      {/* Error state */}
      {error && !loading && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '24px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
          }}
        >
          Error loading board: {error}
        </div>
      )}

      {/* Kanban board — shrinks when detail panel is open */}
      {!loading && !error && board && (
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            transition: 'padding-right 0.2s ease-out',
            paddingRight: selectedCardId ? '488px' : '0',
          }}
        >
          <BoardKanban
            board={board}
            cards={cards}
            filteredCards={filteredCards}
            onMoveCard={handleMoveCard}
            onReorderCard={handleReorderCard}
            onCardClick={handleCardClick}
            onCardCreated={handleCardCreated}
            onImportComplete={handleImportComplete}
            newCardIds={newCardIds}
          />
        </div>
      )}

      {/* Card detail panel */}
      {selectedCardId && (
        <CardDetailPanel
          cardId={selectedCardId}
          onClose={() => setSelectedCardId(null)}
          onCardDeleted={refetch}
          onNavigateToCard={setSelectedCardId}
        />
      )}

      {/* Column Manager modal */}
      {showColumnManager && board && (
        <ColumnManager
          boardId={boardId}
          columns={board.columns}
          workflowStates={workflowStates}
          onClose={() => setShowColumnManager(false)}
          onColumnsChanged={refetch}
        />
      )}

      {/* Global CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
