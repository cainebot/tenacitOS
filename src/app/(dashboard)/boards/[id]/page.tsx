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
import { ChevronDown, Check } from 'lucide-react'
import { AgentFilterProvider, useAgentFilter, type AgentListItem } from '@/contexts/AgentFilterContext'
import { AgentSidePanel } from '@/components/organisms/AgentSidePanel'
import { cx, ConfirmActionDialog } from '@openclaw/ui'

// Loading skeleton for the Kanban board
function KanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto py-1 pb-3">
      {[1, 2, 3].map((col) => (
        <div key={col} className="w-[280px] shrink-0">
          {/* Column header skeleton */}
          <div className="h-[38px] bg-secondary border border-secondary rounded-[6px] mb-2 opacity-50" />
          {/* Card skeletons */}
          {[1, 2, 3, 4].map((card) => (
            <div
              key={card}
              className="bg-secondary border border-secondary rounded-[6px] mb-2 opacity-40"
              style={{ height: `${48 + card * 8}px` }}
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
  const { agents, setAgents, selectedAgentId, setSelectedAgentId, agentPanelOpen, setAgentPanelOpen, setBoardId, scrumMasterAgentId, setScrumMasterAgentId } = useAgentFilter()

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

  // Scrum Master assignment
  const [showSMDropdown, setShowSMDropdown] = useState(false)
  const [smConfirmAgent, setSMConfirmAgent] = useState<AgentListItem | null>(null)
  const [smSaving, setSMSaving] = useState(false)
  const [smError, setSMError] = useState<string | null>(null)

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

  // Scrum Master save handler
  const handleSetScrumMaster = useCallback(async (agentId: string | null) => {
    setSMSaving(true)
    setSMError(null)
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scrum_master_agent_id: agentId }),
      })
      if (!res.ok) throw new Error('Save failed')
      setScrumMasterAgentId(agentId)
      setSMConfirmAgent(null)
      setShowSMDropdown(false)
    } catch {
      setSMError('Could not update Scrum Master. Try again.')
      setTimeout(() => setSMError(null), 3000)
    } finally {
      setSMSaving(false)
    }
  }, [boardId, setScrumMasterAgentId])

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
    <div className="flex flex-col h-full">
      {/* Board selector dropdown */}
      {allBoards.length > 0 && (
        <div className="relative inline-block mt-3 mb-1 px-6">
          <button
            onClick={() => setShowBoardDropdown(!showBoardDropdown)}
            className={cx(
              'flex items-center gap-1.5 font-display text-[15px] font-semibold text-primary',
              'bg-transparent border border-secondary rounded-[6px] px-3 py-1.5 cursor-pointer',
              'transition-colors duration-150',
              'hover:border-accent'
            )}
          >
            {board?.name ?? 'Select Board'}
            <ChevronDown
              size={14}
              className={cx(
                'text-quaternary transition-transform duration-150',
                showBoardDropdown ? 'rotate-180' : 'rotate-0'
              )}
            />
          </button>

          {/* Dropdown overlay */}
          {showBoardDropdown && (
            <>
              <div
                className="fixed inset-0 z-[99]"
                onClick={() => { setShowBoardDropdown(false); setCreatingBoard(false); setNewBoardName('') }}
              />
              <div className="absolute top-full left-0 mt-1 min-w-[220px] bg-tertiary border border-secondary rounded-[6px] shadow-[0_4px_16px_rgba(0,0,0,0.25)] z-[100] overflow-hidden">
                {/* Board list */}
                <div className="max-h-60 overflow-y-auto">
                  {allBoards.map((b) => {
                    const isActive = b.board_id === boardId
                    return (
                      <button
                        key={b.board_id}
                        onClick={() => {
                          setShowBoardDropdown(false)
                          if (!isActive) router.push(`/boards/${b.board_id}`)
                        }}
                        className={cx(
                          'flex items-center gap-2 w-full px-3 py-2 border-none cursor-pointer font-body text-[13px] text-left transition-colors duration-100',
                          isActive
                            ? 'bg-brand-50/10 font-semibold text-brand-600'
                            : 'bg-transparent font-normal text-primary hover:bg-white/[0.04]'
                        )}
                      >
                        {isActive && <span className="text-[11px]">&#10003;</span>}
                        {b.name}
                      </button>
                    )
                  })}
                </div>

                {/* Separator + Create board */}
                <div className="border-t border-secondary">
                  {creatingBoard ? (
                    <div className="px-3 py-2 flex gap-1.5">
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
                        className="flex-1 font-body text-xs bg-secondary border border-secondary rounded px-2 py-1 text-primary outline-none min-w-0"
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
                        className={cx(
                          'font-body text-[11px] font-semibold border-none rounded px-2.5 py-1 shrink-0',
                          newBoardName.trim()
                            ? 'bg-brand-50 text-white cursor-pointer'
                            : 'bg-secondary text-quaternary cursor-not-allowed'
                        )}
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
                      className="flex items-center gap-1.5 w-full px-3 py-2 bg-transparent border-none cursor-pointer font-body text-[13px] text-brand-600 text-left transition-colors duration-100 hover:bg-brand-50/[0.08]"
                    >
                      <span className="text-sm font-bold">+</span>
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
        <div className="flex items-center gap-2 px-6 pt-4 pb-2 max-h-14">
          {/* Board name + description */}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-[16px] font-bold text-primary m-0 leading-[1.2] overflow-hidden text-ellipsis whitespace-nowrap">
              {board.name}
            </h1>
            {board.description && (
              <p className="font-body text-[13px] font-medium text-secondary mt-0.5 mb-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {board.description}
              </p>
            )}
          </div>
          {/* Manage Columns button */}
          <button
            onClick={() => setShowColumnManager(true)}
            title="Manage Columns"
            className="flex items-center gap-[5px] font-body text-xs text-secondary bg-transparent border border-secondary rounded-[6px] px-2.5 py-1 cursor-pointer shrink-0 transition-colors duration-100 hover:bg-secondary hover:text-primary"
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

          {/* Scrum Master assignment */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSMDropdown(!showSMDropdown)}
              title="Set Scrum Master"
              className="flex items-center gap-[5px] font-body text-xs text-secondary bg-transparent border border-secondary rounded-[6px] px-2.5 py-1 cursor-pointer transition-colors duration-100 max-w-[200px] hover:bg-secondary hover:text-primary"
            >
              <span className="text-[10px] font-bold tracking-[0.5px] text-quaternary uppercase">
                SCRUM MASTER
              </span>
              <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px]">
                {scrumMasterAgentId
                  ? (agents.find((a) => a.agent_id === scrumMasterAgentId)?.name ?? 'Unknown')
                  : <span className="text-quaternary italic">No Scrum Master assigned</span>
                }
              </span>
              <ChevronDown
                size={12}
                className={cx(
                  'text-quaternary shrink-0 transition-transform duration-150',
                  showSMDropdown ? 'rotate-180' : 'rotate-0'
                )}
              />
            </button>

            {smError && (
              <div className="absolute top-full left-0 mt-1 text-[11px] text-error-600 bg-tertiary border border-secondary rounded px-2 py-1 whitespace-nowrap z-[101]">
                {smError}
              </div>
            )}

            {showSMDropdown && (
              <>
                <div
                  className="fixed inset-0 z-[99]"
                  onClick={() => setShowSMDropdown(false)}
                />
                <div className="absolute top-full right-0 mt-1 min-w-[200px] bg-tertiary border border-secondary rounded-[6px] shadow-[0_4px_16px_rgba(0,0,0,0.25)] z-[100] overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    {agents.map((agent) => {
                      const isCurrent = agent.agent_id === scrumMasterAgentId
                      return (
                        <button
                          key={agent.agent_id}
                          onClick={() => {
                            setShowSMDropdown(false)
                            setSMConfirmAgent(agent)
                          }}
                          className={cx(
                            'flex items-center gap-2 w-full px-3 py-2 border-none cursor-pointer font-body text-[13px] text-left transition-colors duration-100',
                            isCurrent
                              ? 'bg-[rgba(255,59,48,0.08)] font-semibold text-[#FF3B30]'
                              : 'bg-transparent font-normal text-primary hover:bg-white/[0.04]'
                          )}
                        >
                          {isCurrent && <Check size={12} className="text-[#FF3B30] shrink-0" />}
                          {!isCurrent && <span className="w-3 shrink-0" />}
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                            {agent.emoji && <span className="mr-1">{agent.emoji}</span>}
                            {agent.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
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
        <div className="bg-secondary border border-secondary rounded-lg p-6 text-secondary font-body">
          Error loading board: {error}
        </div>
      )}

      {/* Kanban board — shrinks when detail panel is open */}
      {!loading && !error && board && (
        <div
          className={cx(
            'flex-1 overflow-hidden transition-[padding-right] duration-200 ease-out',
            selectedCardId ? 'pr-[488px]' : 'pr-0'
          )}
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

      {/* Scrum Master confirmation dialog */}
      {smConfirmAgent && (
        <ConfirmActionDialog
          open={!!smConfirmAgent}
          onOpenChange={(open: boolean) => { if (!open) setSMConfirmAgent(null) }}
          title="Set as Scrum Master"
          description={`Set ${smConfirmAgent.name} as Scrum Master for this board? The previous lead will be reassigned to their standard role.`}
          confirmLabel="Set as Scrum Master"
          confirmingLabel="Saving..."
          isConfirming={smSaving}
          onConfirm={() => handleSetScrumMaster(smConfirmAgent.agent_id)}
          errorMessage={smError}
        />
      )}
    </div>
  )
}

// AgentFilterProvider is provided at dashboard layout level (layout.tsx),
// so both DashboardSidebar and BoardPageInner share the same context instance.
export default function BoardPage() {
  return <BoardPageInner />
}
