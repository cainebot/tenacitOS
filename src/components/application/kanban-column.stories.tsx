import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { KanbanColumn } from "./kanban-column"
import { KanbanCard } from "./kanban-card"

const sampleUsers = [
  { id: "1", name: "Olivia Rhye", avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces" },
  { id: "2", name: "Phoenix Baker", avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces" },
]

interface CardData {
  id: string
  title: string
  priority?: "critical" | "high" | "medium" | "low" | null
  commentsCount?: number
  subtasks?: { done: number; total: number }
  assigneeId?: string
}

const sampleItems: CardData[] = [
  { id: "1", title: "Storage Used", priority: "high", commentsCount: 1, subtasks: { done: 1, total: 9 }, assigneeId: "1" },
  { id: "2", title: "Occupied Space", priority: "medium", commentsCount: 2, subtasks: { done: 3, total: 7 }, assigneeId: "2" },
  { id: "3", title: "Community Manager tasks for Facebook and LinkedIn", subtasks: { done: 0, total: 4 } },
]

const meta: Meta<typeof KanbanColumn<CardData>> = {
  title: "Application/KanbanColumn",
  tags: ["autodocs"],
  argTypes: {
    isDragActive: { control: "boolean" },
  },
  decorators: [(Story) => <div className="w-[272px]"><Story /></div>],
}

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Default — column with cards
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: () => (
    <KanbanColumn
      columnId="todo"
      title="To do"
      items={sampleItems}
      renderCard={(card) => (
        <KanbanCard
          title={card.title}
          priority={card.priority}
          commentsCount={card.commentsCount}
          subtasks={card.subtasks}
          assignee={card.assigneeId ? sampleUsers.find((u) => u.id === card.assigneeId) : undefined}
          users={sampleUsers}
        />
      )}
    />
  ),
}

// ---------------------------------------------------------------------------
// Empty column
// ---------------------------------------------------------------------------
export const Empty: Story = {
  render: () => (
    <KanbanColumn
      columnId="review"
      title="Review"
      items={[]}
      renderCard={() => null}
    />
  ),
}

// ---------------------------------------------------------------------------
// Active state (drag overlay)
// ---------------------------------------------------------------------------
export const Active: Story = {
  render: () => (
    <KanbanColumn
      columnId="in-progress"
      title="In progress"
      items={sampleItems.slice(0, 2)}
      active
      renderCard={(card) => (
        <KanbanCard
          title={card.title}
          priority={card.priority}
          subtasks={card.subtasks}
          users={sampleUsers}
        />
      )}
    />
  ),
}

// ---------------------------------------------------------------------------
// Single card
// ---------------------------------------------------------------------------
export const SingleCard: Story = {
  render: () => (
    <KanbanColumn
      columnId="done"
      title="Done"
      items={[sampleItems[0]]}
      renderCard={(card) => (
        <KanbanCard
          title={card.title}
          priority={card.priority}
          subtasks={card.subtasks}
          users={sampleUsers}
        />
      )}
    />
  ),
}
