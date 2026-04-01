"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { KanbanCard, type KanbanCardProps, type KanbanCardTag } from "@/components/application/kanban-card"
import { KanbanBoard, type KanbanBoardColumn } from "@/components/application/kanban-board"
import { KanbanBoardHeader } from "@/components/application/kanban-board-header"
import { defaultFilterFields, type FilterRow } from "@/components/application/dynamic-filter"
import { ProjectHeader } from "@/components/application/project-header/project-header"
import type { ProjectCoverValue } from "@/components/application/project-cover/project-cover"
import { TaskDetailPanel } from "@/components/application/task-detail-panel"
import type {
  TaskStatus,
  TaskUser,
  TaskTag,
  Subtask,
  TaskComment,
  TaskAttachment,
  BreadcrumbItem,
} from "@/components/application/task-detail-panel"
import type { DateValue } from "react-aria-components"
import { useBoardData } from "@/hooks/useBoardData"
import { useCardDetail } from "@/hooks/useCardDetail"
import { useRealtimeCards } from "@/hooks/useRealtimeCards"
import { useOptimisticColumns } from "@/hooks/useOptimisticColumns"
import { cardRowToKanbanCardProps, labelToTag, cardDetailToTaskDetailPanelProps, stateCategoryToTaskStatus } from "@/lib/adapters"
import { generateSortOrder } from "@/lib/sort-order"
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

export default function TasksPage() {
  // Board discovery
  const [boardId, setBoardId] = useState("")

  useEffect(() => {
    fetch("/api/boards?workflow_id=")
      .then((r) => r.json())
      .then((boards: BoardRow[]) => {
        const tasksBoard = boards.find((b) => b.name === "Tasks") ?? boards[0]
        if (tasksBoard) setBoardId(tasksBoard.board_id)
      })
      .catch(() => {})
  }, [])

  // Live board data
  const { board, cards, loading, refetch } = useBoardData(boardId)

  // Realtime: any card change triggers a board refetch (RT-01)
  useRealtimeCards(boardId, refetch)

  // Agents for assignee dropdowns
  const [agents, setAgents] = useState<AgentRow[]>([])
  useEffect(() => {
    fetch("/api/agents/list")
      .then((r) => r.json())
      .then((data: AgentRow[]) => setAgents(Array.isArray(data) ? data : []))
      .catch(() => {})
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
      .catch(() => {})
  }, [board?.project_id])

  // First done-category and to-do-category state IDs (board-wide constants)
  const doneStateId = useMemo(() => {
    const doneState = projectStates.find(s => s.category === 'done')
    return doneState?.state_id ?? null
  }, [projectStates])

  const todoStateId = useMemo(() => {
    const todoState = projectStates.find(s => s.category === 'to-do')
    return todoState?.state_id ?? null
  }, [projectStates])

  // KanbanCard user list from agents
  const kanbanUsers = useMemo(
    () => agents.map((a) => ({ id: a.agent_id, name: a.name, avatarUrl: undefined })),
    [agents],
  )

  // Project avatars — empty fallback (project members not available from useBoardData)
  const projectAvatars: { src: string; alt: string }[] = []

  // Derived labels from all cards
  const allLabels = useMemo<KanbanCardTag[]>(() => {
    const labelSet = new Set<string>()
    cards.forEach((c) => c.labels.forEach((l) => labelSet.add(l)))
    return Array.from(labelSet).map(labelToTag)
  }, [cards])

  // UI state — declared here so filteredCards can reference them
  const [filters, setFilters] = useState<FilterRow[]>([])
  const [search, setSearch] = useState("")
  const [cover, setCover] = useState<ProjectCoverValue>({ color: "blue", icon: "tasks" })
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

  // Client-side search + DynamicFilter
  const filteredCards = useMemo(() => {
    let result = cards
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
  }, [cards, search, filters])

  // Build live columns from BoardWithColumns + filteredCards
  const liveColumns = useMemo((): KanbanBoardColumn<LiveCardData>[] => {
    if (!board) return []
    return board.columns.map((col) => ({
      id: col.column_id,
      title: col.name,
      items: filteredCards
        .filter((c) => col.state_ids.includes(c.state_id))
        .sort((a, b) => (a.sort_order > b.sort_order ? 1 : -1))
        .map((c) => {
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
  }, [board, filteredCards, agents, projectStates])

  // Optimistic columns for DnD — mutation-tracking hook replaces fixed-timer pattern
  const { effectiveColumns, applyOptimisticMove } = useOptimisticColumns(liveColumns)

  // Ref to track current effectiveColumns for handleColumnsChange comparison
  const effectiveColumnsRef = useRef(effectiveColumns)
  useEffect(() => {
    effectiveColumnsRef.current = effectiveColumns
  }, [effectiveColumns])

  const handleAddCard = useCallback(
    async (columnId: string) => {
      if (!board) return
      const colDef = board.columns.find((c) => c.column_id === columnId)
      const targetStateId = colDef?.state_ids[0]
      if (!targetStateId) return

      // Calculate sort_order for the new card (append to bottom of column)
      const col = effectiveColumns.find((c) => c.id === columnId)
      const colItems = col?.items ?? []
      const lastItem = colItems[colItems.length - 1]
      const sort_order = lastItem
        ? generateSortOrder(lastItem.cardRow.sort_order, undefined)
        : generateSortOrder()

      await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New card",
          project_id: board.project_id,
          state_id: targetStateId,
          card_type: "task",
          sort_order,
        }),
      })
        .then(() => refetch())
        .catch(() => {})
    },
    [board, refetch, effectiveColumns],
  )

  const handleColumnsChange = useCallback(
    async (newCols: KanbanBoardColumn<LiveCardData>[], meta?: { activeCardId?: string }) => {
      const prev = effectiveColumnsRef.current

      // Detect column title changes
      for (const newCol of newCols) {
        const origCol = prev.find((c) => c.id === newCol.id)
        if (origCol && origCol.title !== newCol.title) {
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
            const before = cardIndex > 0 ? newCol.items[cardIndex - 1].cardRow.sort_order : undefined
            const after = cardIndex < newCol.items.length - 1 ? newCol.items[cardIndex + 1].cardRow.sort_order : undefined
            const sort_order = generateSortOrder(before, after)

            applyOptimisticMove(item.id, wasInCol.id, newCol.id, newCols)
            fetch(`/api/cards/${item.id}/move`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ state_id: targetStateId, moved_by: "human", sort_order }),
            }).catch(() => {
              refetch()
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
            const before = cardIndex > 0 ? newCol.items[cardIndex - 1].cardRow.sort_order : undefined
            const after = cardIndex < newCol.items.length - 1 ? newCol.items[cardIndex + 1].cardRow.sort_order : undefined
            const sort_order = generateSortOrder(before, after)

            fetch(`/api/cards/${movedCardId}/move`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ state_id: targetStateId, moved_by: "human", sort_order }),
            }).catch(() => {
              refetch()
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
    [board, boardId, refetch, applyOptimisticMove],
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
      .catch(() => {})
  }, [detailCard?.card_id, detailCard?.attachments.length])

  // TaskStatus -> state_id reverse mapping for onStatusChange
  const statusToStateId = useMemo((): Partial<Record<TaskStatus, string>> => {
    const map: Partial<Record<TaskStatus, string>> = {}
    for (const s of projectStates) {
      const taskStatus = stateCategoryToTaskStatus(s.category, s.name)
      if (!map[taskStatus]) map[taskStatus] = s.state_id
    }
    return map
  }, [projectStates])

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

  // Status change: resolve TaskStatus string to state_id UUID, then moveCard
  const handlePanelStatusChange = useCallback((status: TaskStatus) => {
    const stateId = statusToStateId[status]
    if (stateId) detailMoveCard(stateId)
  }, [statusToStateId, detailMoveCard])

  // Toggle complete: move to done or first to-do state
  const handleToggleComplete = useCallback(() => {
    if (!detailCard) return
    const currentState = projectStates.find(s => s.state_id === detailCard.state_id)
    const isDone = currentState?.category === 'done'
    const targetStateId = isDone ? todoStateId : doneStateId
    if (targetStateId) detailMoveCard(targetStateId)
  }, [detailCard, projectStates, todoStateId, doneStateId, detailMoveCard])

  // Title change
  const handlePanelTitleChange = useCallback((title: string) => {
    detailUpdateField('title', title)
  }, [detailUpdateField])

  // Assignee change
  const handlePanelAssigneeChange = useCallback((user: TaskUser | null) => {
    detailUpdateField('assigned_agent_id', user?.id ?? null)
  }, [detailUpdateField])

  // Due date change
  const handlePanelDueDateChange = useCallback((date: DateValue | null) => {
    detailUpdateField('due_date', date ? date.toString() : null)
  }, [detailUpdateField])

  // Tags change
  const handlePanelTagsChange = useCallback((tags: TaskTag[]) => {
    detailUpdateField('labels', tags.map(t => t.label))
  }, [detailUpdateField])

  // Priority change
  const handlePanelPriorityChange = useCallback((p: import("@/components/application/kanban-card").Priority | null) => {
    detailUpdateField('priority', p)
  }, [detailUpdateField])

  // Add comment
  const handlePanelAddComment = useCallback(async (content: string) => {
    if (!detailCard) return
    await fetch(`/api/cards/${detailCard.card_id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: 'user', text: content }),
    }).catch(() => {})
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
      }).catch(() => {})
    }
    await detailRefetch()
    refetch()
  }, [detailCard, detailRefetch, refetch])

  // Delete attachment
  const handlePanelDeleteAttachment = useCallback(async (attachmentId: string) => {
    if (!detailCard) return
    await fetch(`/api/cards/${detailCard.card_id}/attachments/${attachmentId}`, {
      method: 'DELETE',
    }).catch(() => {})
    await detailRefetch()
    refetch()
  }, [detailCard, detailRefetch, refetch])

  // Add subtask: create child card with card_type 'subtask'
  const handlePanelAddSubtask = useCallback(async () => {
    if (!detailCard || !todoStateId) return
    await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New subtask',
        project_id: detailCard.project_id,
        state_id: todoStateId,
        card_type: 'subtask',
        parent_card_id: detailCard.card_id,
      }),
    }).catch(() => {})
    await detailRefetch()
    refetch()
  }, [detailCard, todoStateId, detailRefetch, refetch])

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
            fetch(`/api/cards/${card.cardId}/move`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ state_id: targetStateId, moved_by: "human" }),
            }).catch(() => refetch())
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
    [handleCardClick, patchCard, kanbanUsers, allLabels, doneStateId, todoStateId, refetch],
  )

  // Loading state
  if (!boardId || loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-sm text-tertiary">Loading board...</span>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
      <ProjectHeader
        name={board?.name ?? "Tasks"}
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
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            columns={effectiveColumns}
            onColumnsChange={handleColumnsChange}
            onAddCard={handleAddCard}
            size="md"
            className="h-full"
            renderCard={renderCard}
          />
        </div>

        {/* Side Panel — inline flex, shrinks board when open */}
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
              onStatusChange={handlePanelStatusChange}
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
              bodyContent={panelDataProps?.bodyContent}
              attachments={panelDataProps?.attachments}
              onFilesSelected={handlePanelFilesSelected}
              onDeleteAttachment={handlePanelDeleteAttachment}
              comments={panelDataProps?.comments}
              onAddComment={handlePanelAddComment}
              className="h-full border-l border-secondary"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
