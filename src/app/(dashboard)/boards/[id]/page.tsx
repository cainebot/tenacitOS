'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type {
  BoardRow,
  CardRow,
  WorkflowStateRow,
  CustomFieldDefinitionRow,
  CardCustomFieldValueRow,
} from '@/types/workflow'
import { createBrowserClient } from '@/lib/supabase'
import { useBoardData } from '@/hooks/useBoardData'
import { useRealtimeCards } from '@/hooks/useRealtimeCards'
import { BoardKanban } from '@/components/BoardKanban'
import { BoardFilterBar } from '@/components/BoardFilterBar'
import { CardDetailPanel } from '@/components/CardDetailPanel'
import { ColumnManager } from '@/components/ColumnManager'
import { ChevronDown } from 'lucide-react'
import { AgentFilterProvider, useAgentFilter, type AgentListItem } from '@/contexts/AgentFilterContext'
import { AgentSidePanel } from '@/components/organisms/AgentSidePanel'

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

function BoardPageInner() {
  const params = useParams()
  const router = useRouter()
  const boardId = params.id as string

  const { board, cards: initialCards, loading, error, refetch } = useBoardData(boardId)

  // Agent filter context (provided by outer BoardPage wrapper)
  const { agents, setAgents, selectedAgentId, setSelectedAgentId, agentPanelOpen, setAgentPanelOpen, setBoardId, setScrumMasterAgentId } = useAgentFilter()

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

  // Custom field data for filter bar
  const [fieldDefs, setFieldDefs] = useState<CustomFieldDefinitionRow[]>([])
  const [fieldValuesByCard, setFieldValuesByCard] = useState<
    Record<string, CardCustomFieldValueRow[]>
  >({})

  // All boards for the selector dropdown
  const [allBoards, setAllBoards] = useState<BoardRow[]>([])
  const [showBoardDropdown, setShowBoardDropdown] = useState(false)
  const [creatingBoard, setCreatingBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const newBoardInputRef = useRef<HTMLInputElement>(null)

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

  // Fetch custom field definitions when board loads (needed for filter bar custom field support)
  useEffect(() => {
    if (board?.workflow_id) {
      fetch(`/api/workflows/${board.workflow_id}/fields`)
        .then((res) => (res.ok ? res.json() : []))
        .then((defs: CustomFieldDefinitionRow[]) => setFieldDefs(defs))
        .catch(() => {}) // non-critical — filter bar degrades gracefully without field defs
    }
  }, [board?.workflow_id])

  // Fetch card custom field values when card list changes (needed for filter bar filtering)
  // Use a stable key (sorted card IDs) to avoid re-running when cards array reference changes but content is the same
  const cardIdsKey = cards.map((c) => c.card_id).sort().join(',')
  useEffect(() => {
    if (!cardIdsKey) {
      setFieldValuesByCard({})
      return
    }
    const cardIds = cardIdsKey.split(',')
    const supabase = createBrowserClient()
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('card_custom_field_values')
          .select('card_id, field_id, value')
          .in('card_id', cardIds)
        // Gracefully handle any error (table may not exist yet — migration 06 not applied)
        if (error || !data) return
        // Group by card_id
        const grouped: Record<string, CardCustomFieldValueRow[]> = {}
        for (const row of data as CardCustomFieldValueRow[]) {
          if (!grouped[row.card_id]) grouped[row.card_id] = []
          grouped[row.card_id].push(row)
        }
        setFieldValuesByCard(grouped)
      } catch {
        // non-critical
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardIdsKey])

  // Fetch all boards for the tab bar
  useEffect(() => {
    fetch('/api/boards')
      .then((res) => res.json())
      .then((data: BoardRow[]) => setAllBoards(data))
      .catch(() => {}) // non-critical
  }, [])

  // Fetch agents list for sidebar AGENTS section
  useEffect(() => {
    fetch('/api/agents/list')
      .then((res) => res.json())
      .then((data: AgentListItem[]) => setAgents(Array.isArray(data) ? data : []))
      .catch(() => setAgents([]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set boardId in context so AgentSidePanel can fetch cards for this board
  useEffect(() => {
    setBoardId(boardId)
  }, [boardId, setBoardId])

  // Set scrum master from board data
  useEffect(() => {
    if (board?.scrum_master_agent_id !== undefined) {
      setScrumMasterAgentId(board.scrum_master_agent_id)
    }
  }, [board?.scrum_master_agent_id, setScrumMasterAgentId])

  // Handle realtime card changes — skip refetch for self-edits on the selected card,
  // debounce rapid events to avoid "page refreshing like crazy" during typing
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleCardChange = useCallback(
    async (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
      // Skip UPDATE events for the currently-selected card (user is editing it in the detail panel)
      if (
        payload.eventType === 'UPDATE' &&
        selectedCardId &&
        (payload.new?.card_id === selectedCardId || payload.old?.card_id === selectedCardId)
      ) {
        return
      }
      // Debounce rapid events (e.g. multiple field saves in quick succession)
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current)
      realtimeTimerRef.current = setTimeout(async () => {
        await refetch()
      }, 1000)
    },
    [refetch, selectedCardId]
  )

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

  // Card click: open detail panel, close agent panel (mutual exclusion)
  const handleCardClick = useCallback((cardId: string) => {
    setSelectedCardId(cardId)
    // Close agent panel when card detail opens (one panel at a time)
    setAgentPanelOpen(false)
  }, [setAgentPanelOpen])

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

  // Derived display cards: apply agent filter on top of BoardFilterBar filter
  // When an agent is selected, only show cards where card.assigned_agent_id === selectedAgentId
  const displayCards = selectedAgentId
    ? (filteredCards ?? cards).filter((c) => c.assigned_agent_id === selectedAgentId)
    : filteredCards  // null = show all (existing behavior preserved)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Board selector dropdown */}
      {allBoards.length > 0 && (
        <div style={{ position: 'relative', display: 'inline-block', marginTop: '12px', marginBottom: '4px', padding: '0 24px' }}>
          <button
            onClick={() => setShowBoardDropdown(!showBoardDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-heading)',
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent, #6366f1)' }}
            onMouseLeave={(e) => { if (!showBoardDropdown) e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            {board?.name ?? 'Select Board'}
            <ChevronDown size={14} style={{ color: 'var(--text-muted)', transition: 'transform 0.15s', transform: showBoardDropdown ? 'rotate(180deg)' : 'rotate(0)' }} />
          </button>

          {/* Dropdown overlay */}
          {showBoardDropdown && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={() => { setShowBoardDropdown(false); setCreatingBoard(false); setNewBoardName('') }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  minWidth: '220px',
                  background: 'var(--surface-elevated, var(--surface))',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  zIndex: 100,
                  overflow: 'hidden',
                }}
              >
                {/* Board list */}
                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {allBoards.map((b) => {
                    const isActive = b.board_id === boardId
                    return (
                      <button
                        key={b.board_id}
                        onClick={() => {
                          setShowBoardDropdown(false)
                          if (!isActive) router.push(`/boards/${b.board_id}`)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 12px',
                          background: isActive ? 'rgba(99,102,241,0.1)' : 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                          fontSize: '13px',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? 'var(--accent, #6366f1)' : 'var(--text-primary)',
                          textAlign: 'left',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'none'
                        }}
                      >
                        {isActive && <span style={{ fontSize: '11px' }}>&#10003;</span>}
                        {b.name}
                      </button>
                    )
                  })}
                </div>

                {/* Separator + Create board */}
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {creatingBoard ? (
                    <div style={{ padding: '8px 12px', display: 'flex', gap: '6px' }}>
                      <input
                        ref={newBoardInputRef}
                        type="text"
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && newBoardName.trim()) {
                            try {
                              const res = await fetch('/api/boards', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  name: newBoardName.trim(),
                                  workflow_id: board?.workflow_id,
                                }),
                              })
                              if (res.ok) {
                                const newBoard = await res.json() as BoardRow
                                setShowBoardDropdown(false)
                                setCreatingBoard(false)
                                setNewBoardName('')
                                router.push(`/boards/${newBoard.board_id}`)
                              }
                            } catch { /* silent */ }
                          }
                          if (e.key === 'Escape') {
                            setCreatingBoard(false)
                            setNewBoardName('')
                          }
                        }}
                        placeholder="Board name..."
                        autoFocus
                        style={{
                          flex: 1,
                          fontFamily: 'var(--font-body)',
                          fontSize: '12px',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          minWidth: 0,
                        }}
                      />
                      <button
                        onClick={async () => {
                          if (!newBoardName.trim()) return
                          try {
                            const res = await fetch('/api/boards', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                name: newBoardName.trim(),
                                workflow_id: board?.workflow_id,
                              }),
                            })
                            if (res.ok) {
                              const newBoard = await res.json() as BoardRow
                              setShowBoardDropdown(false)
                              setCreatingBoard(false)
                              setNewBoardName('')
                              router.push(`/boards/${newBoard.board_id}`)
                            }
                          } catch { /* silent */ }
                        }}
                        disabled={!newBoardName.trim()}
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: newBoardName.trim() ? 'var(--accent, #6366f1)' : 'var(--surface)',
                          color: newBoardName.trim() ? '#fff' : 'var(--text-muted)',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 10px',
                          cursor: newBoardName.trim() ? 'pointer' : 'not-allowed',
                          flexShrink: 0,
                        }}
                      >
                        Create
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setCreatingBoard(true)
                        setTimeout(() => newBoardInputRef.current?.focus(), 50)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        width: '100%',
                        padding: '8px 12px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: 'var(--accent, #6366f1)',
                        textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: 700 }}>+</span>
                      New board
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Board title + toolbar */}
      {board && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '16px 24px 8px 24px',
            maxHeight: '56px',
          }}
        >
          {/* Board name + description */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: '1.2',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {board.name}
            </h1>
            {board.description && (
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                margin: '2px 0 0 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {board.description}
              </p>
            )}
          </div>
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
          fieldDefinitions={fieldDefs}
          cardFieldValues={fieldValuesByCard}
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
            filteredCards={displayCards}
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
          cardCode={cards.find((c) => c.card_id === selectedCardId)?.code}
          cardCodeMap={Object.fromEntries(cards.filter((c) => c.code).map((c) => [c.card_id, c.code!]))}
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

      {/* Agent side panel — overlay, zIndex 49 (below CardDetailPanel at 50) */}
      {agentPanelOpen && selectedAgentId && (() => {
        const selectedAgent = agents.find((a) => a.agent_id === selectedAgentId)
        if (!selectedAgent) return null
        return (
          <AgentSidePanel
            agent={selectedAgent}
            boardId={boardId}
            onClose={() => {
              setAgentPanelOpen(false)
              setSelectedAgentId(null)
            }}
          />
        )
      })()}

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

// AgentFilterProvider is provided at dashboard layout level (layout.tsx),
// so both DashboardSidebar and BoardPageInner share the same context instance.
export default function BoardPage() {
  return <BoardPageInner />
}
