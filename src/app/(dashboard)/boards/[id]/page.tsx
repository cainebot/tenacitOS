'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { BoardRow, CardRow } from '@/types/workflow'
import { useBoardData } from '@/hooks/useBoardData'
import { useRealtimeCards } from '@/hooks/useRealtimeCards'
import { BoardKanban } from '@/components/BoardKanban'
import { BoardFilterBar } from '@/components/BoardFilterBar'
import { CardDetailPanel } from '@/components/CardDetailPanel'

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

  // All boards for the tab bar
  const [allBoards, setAllBoards] = useState<BoardRow[]>([])

  // Track previous card IDs to detect new cards from realtime
  const prevCardIdsRef = useRef<Set<string>>(new Set())

  // Sync local cards with data from hook
  useEffect(() => {
    setCards(initialCards)
    prevCardIdsRef.current = new Set(initialCards.map((c) => c.card_id))
  }, [initialCards])

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

      {/* Board title */}
      {board && (
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '12px 0 8px 0',
          }}
        >
          {board.name}
        </h1>
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
