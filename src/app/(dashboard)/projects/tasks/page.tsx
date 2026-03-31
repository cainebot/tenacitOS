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
import { cardRowToKanbanCardProps, labelToTag } from "@/lib/adapters"
import { parseDate } from "@internationalized/date"
import type { CardRow, BoardRow } from "@/types/project"
import type { AgentRow } from "@/types/supabase"

// ---------------------------------------------------------------------------
// Mock data — Task Detail Panel (preserved for Phase 65)
// ---------------------------------------------------------------------------

const mockTaskUsers: TaskUser[] = [
  { id: "1", name: "Jose Miguel Ojeda", role: "Project Lead" },
  { id: "2", name: "Joan Marcel", role: "Developer" },
  { id: "3", name: "Ivana Rodriguez", role: "Designer" },
  { id: "4", name: "Carlos Mendez", role: "QA Engineer" },
]

const mockAvailableTags: TaskTag[] = [
  { label: "Frontend", color: "purple" },
  { label: "Urgent", color: "error" },
  { label: "Design", color: "blue" },
  { label: "Backend", color: "success" },
  { label: "Documentation", color: "warning" },
  { label: "Refactor", color: "orange" },
]

const mockBreadcrumbs: BreadcrumbItem[] = [
  { code: "KAN-5", taskType: "epic" },
  { code: "KAN-1", taskType: "story" },
]

const mockSubtasks: Subtask[] = [
  { id: "s1", code: "KAN-4", title: "Setup project structure", taskType: "subtask", priority: "medium", assignee: null, status: "done" },
  { id: "s2", code: "KAN-6", title: "Design landing page mockups", taskType: "subtask", priority: "high", assignee: mockTaskUsers[2], status: "in_progress" },
  { id: "s3", code: "KAN-7", title: "Implement authentication flow", taskType: "subtask", priority: "critical", assignee: mockTaskUsers[1], status: "todo" },
]

const mockComments: TaskComment[] = [
  { id: "c1", author: mockTaskUsers[0], content: "Created this task", createdAt: "Jul 13, 2022", isSystemEvent: true },
  { id: "c2", author: mockTaskUsers[0], content: "Assigned to Joan Marcel", createdAt: "Jul 13, 2022", isSystemEvent: true },
  { id: "c3", author: mockTaskUsers[1], content: "I have delegated this task to Ivana, she will assist me with this since I cannot do the assignment.", createdAt: "Jul 18, 2022" },
  { id: "c4", author: mockTaskUsers[0], content: "In DRIVE Unow > Portfolio you can find the project listing.", createdAt: "Jul 21, 2022" },
]

const mockAttachments: TaskAttachment[] = [
  { id: "a1", name: "wireframe-v2.fig", size: "4.2 MB", createdAt: "Jul 15, 2022" },
  { id: "a2", name: "requirements.pdf", size: "1.8 MB", createdAt: "Jul 16, 2022" },
]

const mockBodyContent = `
<p>We need the Unow Work Portfolio to include in:</p>
<ul>
  <li>New Unow website</li>
  <li>Unow sales dossier</li>
  <li>Sortlist</li>
  <li>Malt?</li>
</ul>
<p>Each work item should contain:</p>
<ul>
  <li>Photos (screenshots) or videos</li>
  <li>Title</li>
  <li>Client</li>
  <li>Text: Challenges, Solution, Impact</li>
</ul>
<p>In <a href="#">DRIVE</a></p>
`

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

  // Agents for assignee dropdowns
  const [agents, setAgents] = useState<AgentRow[]>([])
  useEffect(() => {
    fetch("/api/agents/list")
      .then((r) => r.json())
      .then((data: AgentRow[]) => setAgents(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

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

  // Build live columns from BoardWithColumns + cards
  const liveColumns = useMemo((): KanbanBoardColumn<LiveCardData>[] => {
    if (!board) return []
    return board.columns.map((col) => ({
      id: col.column_id,
      title: col.name,
      items: cards
        .filter((c) => col.state_ids.includes(c.state_id))
        .sort((a, b) => (a.sort_order > b.sort_order ? 1 : -1))
        .map((c) => {
          const props = cardRowToKanbanCardProps(c, agents)
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
  }, [board, cards, agents])

  // Optimistic columns for DnD
  const prevColumnsRef = useRef(liveColumns)
  useEffect(() => {
    prevColumnsRef.current = liveColumns
  }, [liveColumns])

  const [optimisticColumns, setOptimisticColumns] = useState<KanbanBoardColumn<LiveCardData>[] | null>(null)

  const handleColumnsChange = useCallback(
    async (newCols: KanbanBoardColumn<LiveCardData>[]) => {
      const prev = prevColumnsRef.current
      setOptimisticColumns(newCols)

      // Detect card moves (card appeared in a different column)
      for (const newCol of newCols) {
        const colDef = board?.columns.find((c) => c.column_id === newCol.id)
        const targetStateId = colDef?.state_ids[0]
        if (!targetStateId) continue

        for (const item of newCol.items) {
          const wasInCol = prev.find((pc) => pc.items.some((i) => i.id === item.id))
          if (wasInCol && wasInCol.id !== newCol.id) {
            fetch(`/api/cards/${item.id}/move`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ state_id: targetStateId, moved_by: "human" }),
            }).catch(() => {
              setOptimisticColumns(null)
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
          setOptimisticColumns(null)
          refetch()
        })
      }

      // Clear optimistic state after a short delay to allow refetch
      setTimeout(() => setOptimisticColumns(null), 1000)
    },
    [board, boardId, refetch],
  )

  // Effective columns for rendering
  const effectiveColumns = optimisticColumns ?? liveColumns

  // UI state
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

  // Task detail panel state
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [title, setTitle] = useState("Task 1")
  const [status, setStatus] = useState<TaskStatus>("in_progress")
  const [isCompleted, setIsCompleted] = useState(false)
  const [assignee, setAssignee] = useState<TaskUser | null>(mockTaskUsers[1])
  const [dueDate, setDueDate] = useState<DateValue | null>(null)
  const [detailTags, setDetailTags] = useState<TaskTag[]>([
    { label: "Frontend", color: "purple" },
    { label: "Urgent", color: "error" },
    { label: "Design", color: "blue" },
    { label: "Backend", color: "success" },
  ])
  const [priority, setPriority] = useState<import("@/components/application/kanban-card").Priority | null>("high")
  const [comments, setComments] = useState(mockComments)
  const [attachments, setAttachments] = useState(mockAttachments)
  const [description, setDescription] = useState("Short description for this task goes here.")

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

  const handleAddComment = (content: string) => {
    setComments((prev) => [
      ...prev,
      { id: `c${Date.now()}`, author: { id: "current", name: "You" }, content, createdAt: "Just now" },
    ])
  }

  const handleDeleteAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const handleCardClick = useCallback((cardId: string) => {
    setSelectedCardId(cardId)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedCardId(null)
  }, [])

  const isPanelOpen = selectedCardId !== null

  const renderCard = useCallback(
    (card: LiveCardData) => (
      <div onClick={() => handleCardClick(card.id)} className="cursor-pointer">
        <KanbanCard
          title={card.cardRow.title}
          taskType={card.props.taskType}
          tags={card.props.tags}
          priority={card.props.priority}
          assignee={card.props.assignee}
          subtasks={card.props.subtasks}
          commentsCount={card.props.commentsCount}
          done={card.props.done}
          size="md"
          users={kanbanUsers}
          availableTags={allLabels}
          dueDate={card.dueDate}
        />
      </div>
    ),
    [handleCardClick, kanbanUsers, allLabels],
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
              breadcrumbs={mockBreadcrumbs}
              isCompleted={isCompleted}
              onToggleComplete={() => setIsCompleted(!isCompleted)}
              onCopyLink={() => {}}
              onExpand={() => {}}
              onClose={handleClosePanel}
              title={title}
              onTitleChange={setTitle}
              taskType="task"
              status={status}
              onStatusChange={setStatus}
              description={description}
              onDescriptionChange={setDescription}
              assignee={assignee}
              onAssigneeChange={setAssignee}
              users={mockTaskUsers}
              dueDate={dueDate}
              onDueDateChange={setDueDate}
              tags={detailTags}
              availableTags={mockAvailableTags}
              onTagsChange={setDetailTags}
              priority={priority}
              onPriorityChange={setPriority}
              subtasks={mockSubtasks}
              onAddSubtask={() => {}}
              onSubtaskClick={(sub) => console.log("subtask clicked", sub)}
              bodyContent={mockBodyContent}
              attachments={attachments}
              onDeleteAttachment={handleDeleteAttachment}
              onUploadAttachment={() => {}}
              comments={comments}
              onAddComment={handleAddComment}
              className="h-full border-l border-secondary"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
