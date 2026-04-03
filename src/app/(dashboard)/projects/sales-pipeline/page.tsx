"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { KanbanCard, type KanbanCardProps, type KanbanCardTag, type KanbanCardUser, type Priority } from "@/components/application/kanban-card"
import { KanbanBoard, type KanbanBoardColumn } from "@/components/application/kanban-board"
import { KanbanBoardHeader } from "@/components/application/kanban-board-header"
import { KanbanBoardSkeleton } from "@/components/application/kanban-board-skeleton"
import { defaultFilterFields, type FilterRow } from "@/components/application/dynamic-filter"
import { ProjectHeader } from "@/components/application/project-header/project-header"
import type { ProjectCoverValue } from "@/components/application/project-cover/project-cover"
import { TaskDetailPanel } from "@/components/application/task-detail-panel"
import { TaskDetailPanelSkeleton } from "@/components/application/task-detail-panel-skeleton"
import type {
  TaskUser,
  TaskTag,
  Subtask,
  TaskComment,
  TaskAttachment,
  BreadcrumbItem,
  Priority as TaskPriority,
  TaskStatus,
} from "@/components/application/task-detail-panel"
import type { DateValue } from "react-aria-components"
import { useBoardData } from "@/hooks/useBoardData"
import { useCardDetail } from "@/hooks/useCardDetail"
import { useStoreSyncRealtime } from "@/hooks/use-store-sync-realtime"
import { useBoardSyncEngine } from "@/hooks/use-board-sync-engine"
import { useBoardStore, type BoardColumn } from "@/stores/board-store"
import { cardRowToKanbanCardProps, labelToTag, cardDetailToTaskDetailPanelProps } from "@/lib/adapters"
import { sortKeyBetween } from "@/lib/fractional-index"
import { parseDate } from "@internationalized/date"
import type { CardRow, BoardRow, ProjectStateRow } from "@/types/project"
import type { AgentRow } from "@/types/supabase"

// ---------------------------------------------------------------------------
// Live card item type
// ---------------------------------------------------------------------------

interface LiveCardData {
  id: string
  cardId: string
  stateId: string
  cardRow: CardRow
  props: Partial<KanbanCardProps>
  dueDate: DateValue | null
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SalesPipelinePage() {
  // Board discovery
  const [boardId, setBoardId] = useState("")

  useEffect(() => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((boards: BoardRow[]) => {
        const pipelineBoard = boards.find((b) => b.name === "Sales Pipeline") ?? boards[0]
        if (pipelineBoard) setBoardId(pipelineBoard.board_id)
      })
      .catch((err) => { console.error('[board-load] Failed:', err) })
  }, [])

  // Live board data
  const { board, cards, maxSyncId, loading, refetch } = useBoardData(boardId)

  // Realtime: store-aware sync — UPDATE patches in-memory, INSERT/DELETE triggers refetch
  // (Phase 73: kept for non-positional metadata patches; position driven by sync engine below)
  useStoreSyncRealtime(boardId, refetch)

  // Derive serverColumns from board+cards for sync engine seeding (D-08)
  // Must be a stable useMemo — not derived inside useEffect — so the sync engine
  // receives the right columns + maxSyncId in the same render cycle they arrive.
  const serverColumns = useMemo((): BoardColumn[] | undefined => {
    if (!board) return undefined
    return board.columns.map(col => ({
      columnId: col.column_id,
      title: col.name,
      stateId: col.state_ids[0] ?? '',
      items: cards
        .filter(c => col.state_ids.includes(c.state_id) && c.card_type !== 'epic')
        .sort((a, b) => (a.sort_order < b.sort_order ? -1 : 1)),
    }))
  }, [board, cards])

  // Phase 73: Sync engine — causal event stream for board position correctness
  const syncEngine = useBoardSyncEngine({
    boardId,
    serverColumns,
    maxSyncId,
    onRefetch: refetch,
  })

  // Agents for assignee dropdowns
  const [agents, setAgents] = useState<AgentRow[]>([])
  useEffect(() => {
    fetch("/api/agents/list")
      .then((r) => r.json())
      .then((data: AgentRow[]) => setAgents(Array.isArray(data) ? data : []))
      .catch((err) => { console.error('[agent-load] Failed:', err) })
  }, [])

  // Project states for done category derivation
  const [projectStates, setProjectStates] = useState<ProjectStateRow[]>([])
  useEffect(() => {
    if (!board?.project_id) return
    fetch(`/api/projects/${board.project_id}`)
      .then((r) => r.json())
      .then((data: { states?: ProjectStateRow[] }) => {
        if (data.states) setProjectStates(data.states)
      })
      .catch((err) => { console.error('[project-states-load] Failed:', err) })
  }, [board?.project_id])

  // First done-category and to-do-category state IDs (board-wide constants)
  const doneStateId = useMemo(() => {
    const doneState = projectStates.find(s => s.category === 'done')
    return doneState?.state_id ?? null
  }, [projectStates])

  const todoStateId = useMemo(() => {
    const todoState = projectStates.find(s => s.category === 'to-do')
    return todoState?.state_id ?? projectStates[0]?.state_id ?? null
  }, [projectStates])

  // KanbanCard user list from agents
  const kanbanUsers = useMemo(
    () => agents.map((a) => ({ id: a.agent_id, name: a.name, avatarUrl: undefined })),
    [agents],
  )

  // Project avatars — empty fallback (project members not available from useBoardData)
  const projectAvatars: { src: string; alt: string }[] = []

  // UI state — declared here so filteredCards can reference them
  const [filters, setFilters] = useState<FilterRow[]>([])
  const [search, setSearch] = useState("")
  const [cover, setCover] = useState<ProjectCoverValue>({ color: "orange", icon: "rocket" })
  const [selectedTab, setSelectedTab] = useState("board")

  // Filter fields with live agents
  const filterFields = useMemo(
    () =>
      defaultFilterFields.map((f) =>
        f.type === "member"
          ? { ...f, values: agents.map((a) => ({ id: a.agent_id, label: a.name, avatarUrl: undefined })) }
          : f,
      ),
    [agents],
  )

  // Zustand store selectors
  const storeLoadBoard = useBoardStore(s => s.loadBoard)
  const storeColumns = useBoardStore(s => s.columns)
  const storeRenameColumn = useBoardStore(s => s.renameColumn)

  // Seed the store only on initial load (boardId first appearance) or when boardId changes.
  // DO NOT include `cards` in the dependency array — server refetches that update `cards`
  // must NOT call storeLoadBoard() again, because that would destroy any optimistic
  // reordering already applied to the store (RC-4 fix).
  const hasSeededRef = useRef(false)
  const seededBoardIdRef = useRef<string>("")

  useEffect(() => {
    if (!board || !boardId) return
    // Re-seed only when the boardId changes (new board loaded) or on first mount
    if (hasSeededRef.current && seededBoardIdRef.current === boardId) return
    const columns: BoardColumn[] = board.columns.map(col => ({
      columnId: col.column_id,
      title: col.name,
      stateId: col.state_ids[0] ?? '',
      items: cards
        .filter(c => col.state_ids.includes(c.state_id) && c.card_type !== 'epic')
        .sort((a, b) => (a.sort_order < b.sort_order ? -1 : 1)),
    }))
    storeLoadBoard(boardId, columns)
    hasSeededRef.current = true
    seededBoardIdRef.current = boardId
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, boardId, storeLoadBoard])
  // NOTE: `cards` intentionally omitted — INSERT/DELETE Realtime events call refetch()
  // which updates `cards`, but the store is kept in sync via useStoreSyncRealtime instead.

  // Derived labels from store columns
  const allLabels = useMemo<KanbanCardTag[]>(() => {
    const labelSet = new Set<string>()
    storeColumns.forEach(col => col.items.forEach(c => c.labels.forEach(l => labelSet.add(l))))
    return Array.from(labelSet).map(labelToTag)
  }, [storeColumns])

  // Flatten all cards from store columns for filter/search
  const allCards = useMemo(() => storeColumns.flatMap(col => col.items), [storeColumns])

  // Client-side search + DynamicFilter (used only to derive filteredCards for display)
  const filteredCards = useMemo(() => {
    let result = allCards
    if (search) {
      const term = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          (c.code ?? "").toLowerCase().includes(term),
      )
    }
    for (const filter of filters) {
      if (!filter.value) continue
      if (filter.fieldType === "priority") {
        result = result.filter((c) => c.priority === filter.value)
      }
      if (filter.fieldType === "member") {
        result = result.filter((c) => c.assigned_agent_id === filter.value)
      }
    }
    return result
  }, [allCards, search, filters])

  // Derive KanbanBoardColumn<LiveCardData> from store columns (already optimistic)
  const effectiveColumns = useMemo((): KanbanBoardColumn<LiveCardData>[] => {
    if (!board) return []
    return storeColumns.map(col => ({
      id: col.columnId,
      title: col.title,
      items: col.items
        .filter(c => {
          // Apply search + filter
          if (search) {
            const term = search.toLowerCase()
            if (!c.title.toLowerCase().includes(term) && !(c.code ?? '').toLowerCase().includes(term)) return false
          }
          for (const filter of filters) {
            if (!filter.value) continue
            if (filter.fieldType === 'priority' && c.priority !== filter.value) return false
            if (filter.fieldType === 'member' && c.assigned_agent_id !== filter.value) return false
          }
          return true
        })
        .map(c => {
          const props = cardRowToKanbanCardProps(c, agents, undefined, projectStates)
          return {
            id: c.card_id,
            cardId: c.card_id,
            stateId: c.state_id,
            cardRow: c,
            props,
            dueDate: c.due_date ? parseDate(c.due_date.slice(0, 10)) : null,
          }
        }),
    }))
  }, [board, storeColumns, agents, projectStates, search, filters])

  // Ref to track current effectiveColumns for handleColumnsChange comparison
  const effectiveColumnsRef = useRef(effectiveColumns)
  useEffect(() => {
    effectiveColumnsRef.current = effectiveColumns
  }, [effectiveColumns])

  // ---------------------------------------------------------------------------
  // Inline card creation
  // ---------------------------------------------------------------------------

  const [addingColumnId, setAddingColumnId] = useState<string | null>(null)
  const inlineCardRef = useRef<HTMLDivElement>(null)
  const pendingCardRef = useRef<{
    priority: Priority | null
    assignee: KanbanCardUser | null
    dueDate: DateValue | null
    tags: KanbanCardTag[]
  }>({ priority: null, assignee: null, dueDate: null, tags: [] })

  const getInlineTitle = useCallback((): string => {
    const titleEl = inlineCardRef.current?.querySelector("[contenteditable]")
    return (titleEl?.textContent || "").trim()
  }, [])

  const commitInlineCard = useCallback(
    (columnId: string) => {
      if (!board) return
      const title = getInlineTitle()
      if (!title) return

      const colDef = board.columns.find((c) => c.column_id === columnId)
      const targetStateId = colDef?.state_ids[0]
      if (!targetStateId) return

      const col = effectiveColumns.find((c) => c.id === columnId)
      const colItems = col?.items ?? []
      const lastItem = colItems[colItems.length - 1]
      const sort_order = lastItem
        ? sortKeyBetween(lastItem.cardRow.sort_order, null)
        : sortKeyBetween(null, null)

      const data = pendingCardRef.current

      fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          project_id: board.project_id,
          state_id: targetStateId,
          card_type: "task",
          sort_order,
          ...(data.priority ? { priority: data.priority } : {}),
          ...(data.assignee?.id ? { assigned_agent_id: data.assignee.id } : {}),
          ...(data.dueDate ? { due_date: data.dueDate.toString() } : {}),
          ...(data.tags.length > 0 ? { labels: data.tags.map((t) => t.label) } : {}),
        }),
      })
        .then(() => refetch())
        .catch((err) => { console.error('[add-card] Failed:', err) })
    },
    [board, effectiveColumns, refetch, getInlineTitle],
  )

  const resetPendingCard = useCallback(() => {
    pendingCardRef.current = { priority: null, assignee: null, dueDate: null, tags: [] }
  }, [])

  // Click-outside detection for inline card
  useEffect(() => {
    if (!addingColumnId) return

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (inlineCardRef.current?.contains(target)) return
      if (target.closest('[data-react-aria-popover], [role="dialog"], [role="listbox"], [data-react-aria-overlay]')) return
      if (target.closest("[data-add-card-button]")) return

      const title = getInlineTitle()
      if (title) {
        commitInlineCard(addingColumnId)
      }
      setAddingColumnId(null)
      resetPendingCard()
    }

    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [addingColumnId, commitInlineCard, getInlineTitle, resetPendingCard])

  const handleAddCard = useCallback(
    (columnId: string) => {
      if (!board) return
      if (addingColumnId === columnId) return

      // Commit current inline card if it has text
      if (addingColumnId) {
        const title = getInlineTitle()
        if (title) {
          commitInlineCard(addingColumnId)
        }
      }

      resetPendingCard()
      setAddingColumnId(columnId)
    },
    [addingColumnId, board, commitInlineCard, getInlineTitle, resetPendingCard],
  )

  const renderAddingCard = useCallback(
    (columnId: string) => (
      <div ref={inlineCardRef}>
        <KanbanCard
          title=""
          autoFocusTitle
          size="md"
          users={kanbanUsers}
          availableTags={allLabels}
          onTitleCommit={(text) => {
            if (text.trim()) {
              pendingCardRef.current = { ...pendingCardRef.current }
              commitInlineCard(columnId)
              setAddingColumnId(null)
              resetPendingCard()
            }
          }}
          onEscape={() => {
            setAddingColumnId(null)
            resetPendingCard()
          }}
          onPriorityChange={(p) => { pendingCardRef.current.priority = p }}
          onAssigneeChange={(u) => { pendingCardRef.current.assignee = u }}
          onDueDateChange={(d) => { pendingCardRef.current.dueDate = d }}
          onTagsChange={(t) => { pendingCardRef.current.tags = t }}
        />
      </div>
    ),
    [kanbanUsers, allLabels, commitInlineCard, resetPendingCard],
  )

  const handleColumnsChange = useCallback(
    async (newCols: KanbanBoardColumn<LiveCardData>[], meta?: { activeCardId?: string }) => {
      const prev = effectiveColumnsRef.current

      // Detect column title changes
      for (const newCol of newCols) {
        const origCol = prev.find((c) => c.id === newCol.id)
        if (origCol && origCol.title !== newCol.title) {
          storeRenameColumn(newCol.id, newCol.title)
          fetch(`/api/boards/${boardId}/columns/${newCol.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newCol.title }),
          }).catch(() => refetch())
        }
      }

      // Detect card moves (card appeared in a different column)
      for (const newCol of newCols) {
        const colDef = board?.columns.find((c) => c.column_id === newCol.id)
        const targetStateId = colDef?.state_ids[0]
        if (!targetStateId) continue

        for (const item of newCol.items) {
          const wasInCol = prev.find((pc) => pc.items.some((i) => i.id === item.id))
          if (wasInCol && wasInCol.id !== newCol.id) {
            // Cross-column move: calculate sort_order from new neighbors
            const cardIndex = newCol.items.findIndex((i) => i.id === item.id)
            const beforeItem = cardIndex > 0 ? newCol.items[cardIndex - 1] : null
            const afterItem = cardIndex < newCol.items.length - 1 ? newCol.items[cardIndex + 1] : null
            const sortOrder = sortKeyBetween(
              beforeItem ? beforeItem.cardRow.sort_order : null,
              afterItem ? afterItem.cardRow.sort_order : null,
            )

            // Phase 73: route through sync engine for causal ack + rebase
            syncEngine.moveSyncCard({
              cardId: item.id,
              toStateId: targetStateId,
              sortOrder,
              boardId,
            })
          }
        }
      }

      // Detect same-column reorders (item order within a column changed)
      for (const newCol of newCols) {
        const colDef = board?.columns.find((c) => c.column_id === newCol.id)
        const targetStateId = colDef?.state_ids[0]
        if (!targetStateId) continue

        const prevCol = prev.find((c) => c.id === newCol.id)
        if (!prevCol) continue

        const prevIds = prevCol.items.map((i) => i.id)
        const newIds = newCol.items.map((i) => i.id)

        // Same set of items but different order = reorder
        if (
          prevIds.length === newIds.length &&
          prevIds.some((id, idx) => newIds[idx] !== id) &&
          new Set(prevIds).size === new Set(newIds).size &&
          prevIds.every((id) => newIds.includes(id))
        ) {
          // Use activeCardId from drag metadata — the only reliable way to know
          // which card was dragged (index comparison picks the wrong card)
          const movedCardId = meta?.activeCardId && newIds.includes(meta.activeCardId)
            ? meta.activeCardId
            : undefined

          if (movedCardId) {
            const cardIndex = newIds.indexOf(movedCardId)
            const beforeItem = cardIndex > 0 ? newCol.items[cardIndex - 1] : null
            const afterItem = cardIndex < newCol.items.length - 1 ? newCol.items[cardIndex + 1] : null
            const sortOrder = sortKeyBetween(
              beforeItem ? beforeItem.cardRow.sort_order : null,
              afterItem ? afterItem.cardRow.sort_order : null,
            )

            // Phase 73: route through sync engine for causal ack + rebase
            syncEngine.moveSyncCard({
              cardId: movedCardId,
              toStateId: targetStateId,
              sortOrder,
              boardId,
            })
          }
        }
      }

      // Detect column reorder (column order changed, not just items)
      const newOrder = newCols.map((c) => c.id)
      const oldOrder = prev.map((c) => c.id)
      if (JSON.stringify(newOrder) !== JSON.stringify(oldOrder)) {
        fetch(`/api/boards/${boardId}/columns/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ column_ids: newOrder }),
        }).catch(() => {
          refetch()
        })
      }
    },
    [board, boardId, refetch, syncEngine],
  )

  // Task detail panel state
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  // --- Task Detail Panel: live data via useCardDetail ---
  const { card: detailCard, loading: detailLoading, updateField: detailUpdateField, moveCard: detailMoveCard, refetch: detailRefetch } = useCardDetail(selectedCardId)

  // Signed URLs for attachments
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!detailCard || detailCard.attachments.length === 0) {
      setSignedUrls({})
      return
    }
    const paths: Record<string, string> = {}
    for (const a of detailCard.attachments) paths[a.attachment_id] = a.storage_path
    fetch(`/api/cards/${detailCard.card_id}/attachments/urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    })
      .then(r => r.json())
      .then((urls: Record<string, string>) => setSignedUrls(urls))
      .catch((err) => { console.error('[signed-urls] Failed:', err) })
  }, [detailCard?.card_id, detailCard?.attachments.length])

  // Board columns for the panel status dropdown — derived from store (updated on rename)
  const panelBoardColumns = useMemo(
    () => storeColumns.map(col => ({ columnId: col.columnId, name: col.title, stateIds: [col.stateId] })),
    [storeColumns],
  )

  // Panel users derived from agents (same pattern as kanbanUsers but with role for TaskUser shape)
  const panelUsers: TaskUser[] = useMemo(
    () => agents.map(a => ({ id: a.agent_id, name: a.name, role: a.role, avatarUrl: undefined })),
    [agents],
  )

  // Adapter output + dueDate + signed URLs merged
  const panelDataProps = useMemo(() => {
    if (!detailCard) return null
    const base = cardDetailToTaskDetailPanelProps(detailCard, agents, projectStates)
    const dueDate = detailCard.due_date ? parseDate(detailCard.due_date.slice(0, 10)) : null
    const attachments = (base.attachments ?? []).map(a => ({
      ...a,
      thumbnailUrl: signedUrls[a.id] ?? undefined,
    }))
    return { ...base, dueDate, attachments }
  }, [detailCard, agents, projectStates, signedUrls])

  // --- Panel mutation handlers ---

  // Description: debounced save on blur (500ms debounce as safety; primarily on-blur via TipTap)
  const descriptionRef = useRef<string | null>(null)
  const descriptionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleDescriptionChange = useCallback((html: string) => {
    descriptionRef.current = html
    if (descriptionTimerRef.current) clearTimeout(descriptionTimerRef.current)
    descriptionTimerRef.current = setTimeout(() => {
      if (descriptionRef.current !== null) {
        detailUpdateField('description', descriptionRef.current)
      }
    }, 500)
  }, [detailUpdateField])

  // State change: direct state_id from project states dropdown
  const handlePanelStateIdChange = useCallback((stateId: string) => {
    detailMoveCard(stateId)
  }, [detailMoveCard])

  // Toggle complete: move to done or first to-do state
  // D-06: Route through sync engine — single source of truth for all card moves
  const handleToggleComplete = useCallback(() => {
    if (!detailCard) return
    const currentState = projectStates.find(s => s.state_id === detailCard.state_id)
    const isDone = currentState?.category === 'done'
    const targetStateId = isDone ? todoStateId : doneStateId
    if (!targetStateId) return

    // D-07: Compute sort_order — append to bottom of target column
    // Use storeColumns (optimistic state) not cards (server state) — RESEARCH Pitfall 5
    const targetCol = storeColumns.find(col => col.stateId === targetStateId)
    const items = targetCol?.items ?? []
    const lastItem = items[items.length - 1]
    const sortOrder = sortKeyBetween(lastItem?.sort_order ?? null, null)

    syncEngine.moveSyncCard({
      cardId: detailCard.card_id,
      toStateId: targetStateId,
      sortOrder,
      boardId,
    })
  }, [detailCard, projectStates, todoStateId, doneStateId, storeColumns, syncEngine, boardId])

  // Title change
  const handlePanelTitleChange = useCallback((title: string) => {
    if (!selectedCardId) return
    useBoardStore.getState().patchCardInStore(selectedCardId, { title })
    detailUpdateField('title', title)
  }, [selectedCardId, detailUpdateField])

  // Assignee change
  const handlePanelAssigneeChange = useCallback((user: TaskUser | null) => {
    if (!selectedCardId) return
    useBoardStore.getState().patchCardInStore(selectedCardId, { assigned_agent_id: user?.id ?? null })
    detailUpdateField('assigned_agent_id', user?.id ?? null)
  }, [selectedCardId, detailUpdateField])

  // Due date change
  const handlePanelDueDateChange = useCallback((date: DateValue | null) => {
    if (!selectedCardId) return
    useBoardStore.getState().patchCardInStore(selectedCardId, { due_date: date ? date.toString() : null })
    detailUpdateField('due_date', date ? date.toString() : null)
  }, [selectedCardId, detailUpdateField])

  // Tags change
  const handlePanelTagsChange = useCallback((tags: TaskTag[]) => {
    if (!selectedCardId) return
    useBoardStore.getState().patchCardInStore(selectedCardId, { labels: tags.map(t => t.label) })
    detailUpdateField('labels', tags.map(t => t.label))
  }, [selectedCardId, detailUpdateField])

  // Priority change
  const handlePanelPriorityChange = useCallback((p: import("@/components/application/kanban-card").Priority | null) => {
    if (!selectedCardId) return
    useBoardStore.getState().patchCardInStore(selectedCardId, { priority: p ?? undefined })
    detailUpdateField('priority', p)
  }, [selectedCardId, detailUpdateField])

  // Add comment
  const handlePanelAddComment = useCallback(async (content: string) => {
    if (!detailCard) return
    await fetch(`/api/cards/${detailCard.card_id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: 'user', text: content }),
    }).catch((err) => { console.error('[add-comment] Failed:', err) })
    await detailRefetch()
    refetch()
  }, [detailCard, detailRefetch, refetch])

  // Upload attachment (called by onFilesSelected from FileUpload component)
  const handlePanelFilesSelected = useCallback(async (files: File[]) => {
    if (!detailCard) return
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      await fetch(`/api/cards/${detailCard.card_id}/attachments`, {
        method: 'POST',
        body: formData,
      }).catch((err) => { console.error('[upload-attachment] Failed:', err) })
    }
    await detailRefetch()
    refetch()
  }, [detailCard, detailRefetch, refetch])

  // Delete attachment
  const handlePanelDeleteAttachment = useCallback(async (attachmentId: string) => {
    if (!detailCard) return
    await fetch(`/api/cards/${detailCard.card_id}/attachments/${attachmentId}`, {
      method: 'DELETE',
    }).catch((err) => { console.error('[delete-attachment] Failed:', err) })
    await detailRefetch()
    refetch()
  }, [detailCard, detailRefetch, refetch])

  // Add subtask: create child card with card_type 'subtask'
  const handlePanelAddSubtask = useCallback(async (data: { title: string; priority?: TaskPriority; assignee?: string; status?: TaskStatus }) => {
    if (!detailCard || !todoStateId) return
    try {
      await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          project_id: detailCard.project_id,
          state_id: todoStateId,
          card_type: 'subtask',
          parent_card_id: detailCard.card_id,
          ...(data.priority && { priority: data.priority }),
          ...(data.assignee && { assigned_agent_id: data.assignee }),
        }),
      })
    } catch (err) {
      console.error('[handlePanelAddSubtask] Failed to create subtask:', err)
    }
    await detailRefetch()
    refetch()
  }, [detailCard, todoStateId, detailRefetch, refetch])

  // Update subtask field: PATCH for title/priority/assignee, /move for status
  const handleSubtaskUpdate = useCallback(async (subtaskId: string, updates: Partial<Pick<Subtask, 'title' | 'priority' | 'assignee' | 'status'>>) => {
    try {
      // Handle status change separately — requires /move endpoint
      if (updates.status) {
        const targetState = projectStates.find(s => {
          const cat = s.category
          if (updates.status === 'todo') return cat === 'to-do'
          if (updates.status === 'done') return cat === 'done'
          if (updates.status === 'cancelled') return cat === 'done' // map cancelled to done category
          // in_progress and in_review both map to in_progress category
          return cat === 'in_progress'
        })
        if (targetState) {
          await fetch(`/api/cards/${subtaskId}/move`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              state_id: targetState.state_id,
              moved_by: 'user',
            }),
          })
        }
      }

      // Handle field updates (title, priority, assignee) via PATCH
      const patchBody: Record<string, unknown> = {}
      if (updates.title !== undefined) patchBody.title = updates.title
      if (updates.priority !== undefined) patchBody.priority = updates.priority
      if (updates.assignee !== undefined) {
        // Map TaskUser | null → assigned_agent_id string | null
        patchBody.assigned_agent_id = updates.assignee ? updates.assignee.id : null
      }

      if (Object.keys(patchBody).length > 0) {
        await fetch(`/api/cards/${subtaskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        })
      }
    } catch (err) {
      console.error('[handleSubtaskUpdate] Failed to update subtask:', err)
    }
    await detailRefetch()
    refetch()
  }, [projectStates, detailRefetch, refetch])

  // Subtask click: navigate panel to that subtask
  const handleSubtaskClick = useCallback((sub: Subtask) => {
    setSelectedCardId(sub.id)
  }, [])

  // Panel resize
  const [panelWidth, setPanelWidth] = useState(612)
  const isResizing = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    const startX = e.clientX
    const startWidth = panelWidth

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const delta = startX - e.clientX
      const newWidth = Math.min(Math.max(startWidth + delta, 380), 900)
      setPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [panelWidth])

  const patchCard = useCallback(
    async (cardId: string, patch: Record<string, unknown>) => {
      // Optimistic store update — instant KanbanCard reflection, no wait for API round-trip
      useBoardStore.getState().patchCardInStore(cardId, patch as Partial<Pick<CardRow, 'title' | 'description' | 'labels' | 'priority' | 'assigned_agent_id' | 'due_date' | 'card_type'>>)
      await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(() => {
        refetch()
      })
    },
    [refetch],
  )

  const handleCardClick = useCallback((cardId: string) => {
    setSelectedCardId(cardId)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedCardId(null)
  }, [])

  const isPanelOpen = selectedCardId !== null

  const renderCard = useCallback(
    (card: LiveCardData) => (
      <div
        onClickCapture={(e) => {
          const target = e.target as HTMLElement
          const interactive = target.closest('button, input, [role="dialog"], [role="listbox"], [data-react-aria-popover]')
          if (interactive) return
          handleCardClick(card.id)
        }}
        className="cursor-pointer"
      >
        <KanbanCard
          title={card.props.title ?? ""}
          onTitleChange={(title) => patchCard(card.cardId, { title })}
          size="md"
          taskType={card.props.taskType}
          tags={card.props.tags}
          availableTags={allLabels}
          onTagsChange={(tags) =>
            patchCard(card.cardId, { labels: tags.map((t) => t.label) })
          }
          commentsCount={card.props.commentsCount}
          priority={card.props.priority}
          onPriorityChange={(priority) =>
            patchCard(card.cardId, { priority })
          }
          subtasks={card.props.subtasks}
          assignee={card.props.assignee}
          onAssigneeChange={(user) =>
            patchCard(card.cardId, { assigned_agent_id: user?.id ?? null })
          }
          users={kanbanUsers}
          done={card.props.done}
          onDoneChange={(done) => {
            const targetStateId = done ? doneStateId : todoStateId
            if (!targetStateId) return

            // Compute sort_order — append to bottom of target column
            // Use storeColumns (optimistic state) not cards (server state) — RESEARCH Pitfall 5
            const targetCol = storeColumns.find(col => col.stateId === targetStateId)
            const colItems = targetCol?.items ?? []
            const lastColItem = colItems[colItems.length - 1]
            const sortOrder = sortKeyBetween(lastColItem?.sort_order ?? null, null)

            syncEngine.moveSyncCard({
              cardId: card.cardId,
              toStateId: targetStateId,
              sortOrder,
              boardId,
            })
          }}
          dueDate={card.dueDate}
          onDueDateChange={(date) =>
            patchCard(card.cardId, {
              due_date: date ? date.toString() : null,
            })
          }
        />
      </div>
    ),
    [handleCardClick, patchCard, kanbanUsers, allLabels, doneStateId, todoStateId, storeColumns, syncEngine, boardId],
  )

  // Loading state
  if (!boardId || loading) {
    return <KanbanBoardSkeleton />
  }

  return (
    <div className="flex h-full w-full min-w-0 overflow-hidden">
      {/* Left content column */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <ProjectHeader
          name={board?.name ?? "Sales pipeline"}
          cover={cover}
          onCoverChange={setCover}
          avatars={projectAvatars}
          onAddMember={() => {}}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
        />
        <KanbanBoardHeader
          filterFields={filterFields}
          filters={filters}
          onFiltersChange={setFilters}
          search={search}
          onSearchChange={setSearch}
        />
        <div
          className="flex-1 overflow-hidden"
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (target.closest('button, input, textarea, a, [data-card], [role="dialog"], [role="listbox"], [contenteditable], [data-react-aria-popover]')) return
            handleClosePanel()
          }}
        >
          <KanbanBoard
            columns={effectiveColumns}
            onColumnsChange={handleColumnsChange}
            onAddCard={handleAddCard}
            addingColumnId={addingColumnId}
            renderAddingCard={renderAddingCard}
            size="md"
            className="h-full"
            renderCard={renderCard}
          />
        </div>
      </div>

      {/* Side Panel — full height, shrinks board when open */}
      <div
        className="relative flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-out"
        style={{ width: isPanelOpen ? panelWidth : 0 }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute -left-1 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center opacity-0 transition-opacity hover:opacity-100"
        >
          <div className="h-8 w-1 rounded-full bg-fg-quaternary/50" />
        </div>

        {/* Panel content — fixed inner width so content doesn't collapse */}
        <div className="h-full" style={{ width: panelWidth }}>
          {detailLoading ? (
            <TaskDetailPanelSkeleton className="h-full border-l border-secondary" />
          ) : (
          <TaskDetailPanel
            breadcrumbs={panelDataProps?.breadcrumbs}
            isCompleted={panelDataProps?.isCompleted}
            onToggleComplete={handleToggleComplete}
            onCopyLink={() => {}}
            onExpand={() => {}}
            onClose={handleClosePanel}
            title={panelDataProps?.title ?? ''}
            onTitleChange={handlePanelTitleChange}
            taskType={panelDataProps?.taskType}
            status={panelDataProps?.status}
            boardColumns={panelBoardColumns}
            stateId={detailCard?.state_id}
            onStateIdChange={handlePanelStateIdChange}
            description={panelDataProps?.description}
            onDescriptionChange={handleDescriptionChange}
            assignee={panelDataProps?.assignee}
            onAssigneeChange={handlePanelAssigneeChange}
            users={panelUsers}
            dueDate={panelDataProps?.dueDate}
            onDueDateChange={handlePanelDueDateChange}
            tags={panelDataProps?.tags}
            availableTags={allLabels}
            onTagsChange={handlePanelTagsChange}
            priority={panelDataProps?.priority}
            onPriorityChange={handlePanelPriorityChange}
            subtasks={panelDataProps?.subtasks}
            onAddSubtask={handlePanelAddSubtask}
            onSubtaskClick={handleSubtaskClick}
            onSubtaskUpdate={handleSubtaskUpdate}
            bodyContent={panelDataProps?.bodyContent}
            attachments={panelDataProps?.attachments}
            onFilesSelected={handlePanelFilesSelected}
            onDeleteAttachment={handlePanelDeleteAttachment}
            comments={panelDataProps?.comments}
            onAddComment={handlePanelAddComment}
            className="h-full border-l border-secondary"
          />
          )}
        </div>
      </div>
    </div>
  )
}
