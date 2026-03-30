"use client"

import { useState, useCallback, useRef } from "react"
import { KanbanCard, type Priority, type KanbanCardTag } from "@/components/application/kanban-card"
import type { TaskType } from "@/components/application/task-type-indicator"
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

const sampleTags: KanbanCardTag[] = [
  { label: "BackOffice", color: "purple" },
  { label: "Frontend", color: "blue" },
  { label: "Backend", color: "indigo" },
  { label: "Operations", color: "orange" },
  { label: "Marketing", color: "pink" },
  { label: "DevOps", color: "gray-blue" },
  { label: "Auth", color: "error" },
  { label: "Design", color: "brand" },
  { label: "Urgent", color: "warning" },
]

const sampleUsers = [
  { id: "1", name: "Olivia Rhye", avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces" },
  { id: "2", name: "Phoenix Baker", avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces" },
  { id: "3", name: "Lana Steiner", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces" },
  { id: "4", name: "Demi Wilkinson", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&crop=faces" },
]

interface CardData {
  id: string
  title: string
  taskType?: TaskType
  tags?: KanbanCardTag[]
  commentsCount?: number
  priority?: Priority | null
  subtasks?: { done: number; total: number }
  assigneeId?: string
  done?: boolean
}

const initialColumns: KanbanBoardColumn<CardData>[] = [
  {
    id: "todo",
    title: "To do",
    items: [
      { id: "1", title: "Storage Used", taskType: "story", tags: [{ label: "BackOffice", color: "purple" }], commentsCount: 1, priority: "high", subtasks: { done: 1, total: 9 }, assigneeId: "1" },
      { id: "2", title: "Occupied Space", taskType: "epic", tags: [{ label: "Frontend", color: "blue" }], commentsCount: 1, priority: "high", subtasks: { done: 1, total: 9 }, assigneeId: "2" },
      { id: "3", title: "Space Utilized", taskType: "task", tags: [{ label: "Backend", color: "indigo" }], commentsCount: 1, priority: "high", subtasks: { done: 1, total: 9 }, assigneeId: "3" },
    ],
  },
  {
    id: "in-progress",
    title: "In progress",
    items: [
      { id: "4", title: "Purchase of tables/chairs on MercadoLibre - Review office real estate market", taskType: "research", tags: [{ label: "Operations", color: "orange" }], commentsCount: 1, subtasks: { done: 1, total: 9 }, assigneeId: "4" },
      { id: "5", title: "Community Manager tasks for Facebook and LinkedIn", taskType: "subtask", tags: [{ label: "Marketing", color: "pink" }], commentsCount: 2, priority: "medium", subtasks: { done: 3, total: 7 }, assigneeId: "1" },
    ],
  },
  {
    id: "review",
    title: "Review",
    items: [],
  },
  {
    id: "done",
    title: "Done",
    items: [
      { id: "6", title: "Set up CI/CD pipeline for staging", taskType: "task", tags: [{ label: "DevOps", color: "gray-blue" }], commentsCount: 3, subtasks: { done: 5, total: 5 }, assigneeId: "2", done: true },
      { id: "7", title: "Design system token audit", taskType: "bug", priority: "critical", subtasks: { done: 12, total: 12 }, assigneeId: "3", done: true },
      { id: "8", title: "Migrate auth to new provider", taskType: "spike", tags: [{ label: "Auth", color: "error" }], commentsCount: 1, priority: "high", subtasks: { done: 8, total: 8 }, assigneeId: "4", done: true },
    ],
  },
]

const filterFields = defaultFilterFields.map((f) =>
  f.type === "member"
    ? { ...f, values: sampleUsers.map((u) => ({ id: u.id, label: u.name, avatarUrl: u.avatarUrl })) }
    : f,
)

const projectAvatars = [
  { src: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces", alt: "Olivia Rhye" },
  { src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces", alt: "Phoenix Baker" },
  { src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces", alt: "Lana Steiner" },
  { src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&crop=faces", alt: "Demi Wilkinson" },
  { src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=128&h=128&fit=crop&crop=faces", alt: "Drew Cano" },
  { src: "https://images.unsplash.com/photo-1599566150163-29194dcabd9c?w=128&h=128&fit=crop&crop=faces", alt: "Natali Craig" },
  { src: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=128&h=128&fit=crop&crop=faces", alt: "Candice Wu" },
  { src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&h=128&fit=crop&crop=faces", alt: "Orlando Diggs" },
]

// ---------------------------------------------------------------------------
// Mock data — Task Detail Panel
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
// Page
// ---------------------------------------------------------------------------

export default function SalesPipelinePage() {
  // Kanban state
  const [columns, setColumns] = useState(initialColumns)
  const [filters, setFilters] = useState<FilterRow[]>([])
  const [search, setSearch] = useState("")
  const [cover, setCover] = useState<ProjectCoverValue>({ color: "orange", icon: "rocket" })
  const [selectedTab, setSelectedTab] = useState("board")

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
  const [priority, setPriority] = useState<Priority | null>("high")
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

  const updateCard = useCallback((cardId: string, patch: Partial<CardData>) => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        items: col.items.map((item) =>
          item.id === cardId ? { ...item, ...patch } : item,
        ),
      })),
    )
  }, [])

  const handleCardClick = useCallback((cardId: string) => {
    setSelectedCardId(cardId)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedCardId(null)
  }, [])

  const isPanelOpen = selectedCardId !== null

  const renderCard = useCallback((card: CardData) => (
    <div onClick={() => handleCardClick(card.id)} className="cursor-pointer">
      <KanbanCard
        title={card.title}
        onTitleChange={(title) => updateCard(card.id, { title })}
        size="md"
        taskType={card.taskType}
        tags={card.tags}
        availableTags={sampleTags}
        onTagsChange={(tags) => updateCard(card.id, { tags })}
        commentsCount={card.commentsCount}
        priority={card.priority}
        onPriorityChange={(priority) => updateCard(card.id, { priority })}
        subtasks={card.subtasks}
        assignee={card.assigneeId ? sampleUsers.find((u) => u.id === card.assigneeId) : undefined}
        onAssigneeChange={(user) => updateCard(card.id, { assigneeId: user?.id })}
        users={sampleUsers}
        done={card.done}
      />
    </div>
  ), [updateCard, handleCardClick])

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
      <ProjectHeader
        name="Sales pipeline"
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
        <div className="flex-1 overflow-hidden p-6">
          <KanbanBoard
            columns={columns}
            onColumnsChange={setColumns}
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
