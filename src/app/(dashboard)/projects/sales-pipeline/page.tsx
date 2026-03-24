"use client"

import { useState } from "react"
import { KanbanCard, type Priority } from "@/components/application/kanban-card"
import { KanbanBoard, type KanbanBoardColumn } from "@/components/application/kanban-board"

const sampleUsers = [
  { id: "1", name: "Olivia Rhye", avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces" },
  { id: "2", name: "Phoenix Baker", avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces" },
  { id: "3", name: "Lana Steiner", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces" },
  { id: "4", name: "Demi Wilkinson", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&crop=faces" },
]

interface CardData {
  id: string
  title: string
  commentsCount?: number
  priority?: Priority | null
  subtasks?: { done: number; total: number }
  assigneeId?: string
}

const initialColumns: KanbanBoardColumn<CardData>[] = [
  {
    id: "todo",
    title: "To do",
    items: [
      { id: "1", title: "Storage Used", commentsCount: 1, priority: "high", subtasks: { done: 1, total: 9 }, assigneeId: "1" },
      { id: "2", title: "Occupied Space", commentsCount: 1, priority: "high", subtasks: { done: 1, total: 9 }, assigneeId: "2" },
      { id: "3", title: "Space Utilized", commentsCount: 1, priority: "high", subtasks: { done: 1, total: 9 }, assigneeId: "3" },
    ],
  },
  {
    id: "in-progress",
    title: "In progress",
    items: [
      { id: "4", title: "Purchase of tables/chairs on MercadoLibre - Review office real estate market", commentsCount: 1, subtasks: { done: 1, total: 9 }, assigneeId: "4" },
      { id: "5", title: "Community Manager tasks for Facebook and LinkedIn", commentsCount: 2, priority: "medium", subtasks: { done: 3, total: 7 }, assigneeId: "1" },
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
      { id: "6", title: "Set up CI/CD pipeline for staging", commentsCount: 3, subtasks: { done: 5, total: 5 }, assigneeId: "2" },
      { id: "7", title: "Design system token audit", priority: "critical", subtasks: { done: 12, total: 12 }, assigneeId: "3" },
      { id: "8", title: "Migrate auth to new provider", commentsCount: 1, priority: "high", subtasks: { done: 8, total: 8 }, assigneeId: "4" },
    ],
  },
]

export default function SalesPipelinePage() {
  const [columns, setColumns] = useState(initialColumns)

  return (
    <div className="h-full overflow-hidden p-6">
      <KanbanBoard
        columns={columns}
        onColumnsChange={setColumns}
        className="h-full"
        renderCard={(card) => (
          <KanbanCard
            title={card.title}
            commentsCount={card.commentsCount}
            priority={card.priority}
            subtasks={card.subtasks}
            assignee={card.assigneeId ? sampleUsers.find((u) => u.id === card.assigneeId) : undefined}
            users={sampleUsers}
          />
        )}
      />
    </div>
  )
}
