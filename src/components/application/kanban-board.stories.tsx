import { useState, useCallback } from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { KanbanBoard, type KanbanBoardColumn, type KanbanBoardSize } from "./kanban-board"
import { KanbanCard, type Priority, type KanbanCardTag } from "./kanban-card"
import type { TaskType } from "./task-type-indicator"

const sampleUsers = [
  { id: "1", name: "Olivia Rhye", avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces" },
  { id: "2", name: "Phoenix Baker", avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces" },
  { id: "3", name: "Lana Steiner", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces" },
  { id: "4", name: "Demi Wilkinson", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&crop=faces" },
]

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

interface CardData {
  id: string
  title: string
  taskType?: TaskType
  tags?: KanbanCardTag[]
  priority?: Priority | null
  commentsCount?: number
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
    ],
  },
]

function InteractiveBoard({ columns: initialCols, size = "sm" }: { columns: KanbanBoardColumn<CardData>[]; size?: KanbanBoardSize }) {
  const [columns, setColumns] = useState(initialCols)

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

  const renderCard = useCallback((card: CardData) => (
    <KanbanCard
      title={card.title}
      onTitleChange={(title) => updateCard(card.id, { title })}
      size={size}
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
  ), [updateCard, size])

  return (
    <KanbanBoard
      columns={columns}
      onColumnsChange={setColumns}
      size={size}
      renderCard={renderCard}
    />
  )
}

const meta: Meta = {
  title: "Application/KanbanBoard",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  decorators: [(Story) => <div className="p-6"><Story /></div>],
}

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Default — sm size
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: () => <InteractiveBoard columns={initialColumns} />,
}

// ---------------------------------------------------------------------------
// Size md
// ---------------------------------------------------------------------------
export const SizeMd: Story = {
  render: () => <InteractiveBoard columns={initialColumns} size="md" />,
}

// ---------------------------------------------------------------------------
// Two columns
// ---------------------------------------------------------------------------
export const TwoColumns: Story = {
  render: () => <InteractiveBoard columns={initialColumns.slice(0, 2)} />,
}

// ---------------------------------------------------------------------------
// With empty columns
// ---------------------------------------------------------------------------
export const WithEmptyColumn: Story = {
  render: () => (
    <InteractiveBoard columns={[
      initialColumns[0],
      { id: "empty-1", title: "Backlog", items: [] },
      { id: "empty-2", title: "Blocked", items: [] },
      initialColumns[1],
    ]} />
  ),
}

// ---------------------------------------------------------------------------
// Single column
// ---------------------------------------------------------------------------
export const SingleColumn: Story = {
  render: () => <InteractiveBoard columns={[initialColumns[0]]} />,
}
