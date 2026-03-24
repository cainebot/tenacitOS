import type { Meta, StoryObj } from "@storybook/react"
import { KanbanCard } from "./kanban-card"

const sampleUsers = [
  { id: "1", name: "Olivia Rhye", avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces" },
  { id: "2", name: "Phoenix Baker", avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces" },
  { id: "3", name: "Lana Steiner", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces" },
  { id: "4", name: "Demi Wilkinson", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&crop=faces" },
]

const meta: Meta<typeof KanbanCard> = {
  title: "Application/KanbanCard",
  component: KanbanCard,
  tags: ["autodocs"],
  args: {
    title: "Used space",
    users: sampleUsers,
  },
  argTypes: {
    priority: {
      control: "select",
      options: [undefined, "critical", "high", "medium", "low"],
    },
    done: { control: "boolean" },
    commentsCount: { control: "number" },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Default — no priority, no assignee, no date
// ---------------------------------------------------------------------------
export const Default: Story = {
  args: {
    title: "Used space",
    subtasks: { done: 1, total: 9 },
  },
}

// ---------------------------------------------------------------------------
// With priority
// ---------------------------------------------------------------------------
export const WithPriority: Story = {
  args: {
    title: "Used space",
    priority: "high",
    commentsCount: 1,
    subtasks: { done: 1, total: 9 },
  },
}

// ---------------------------------------------------------------------------
// With assignee
// ---------------------------------------------------------------------------
export const WithAssignee: Story = {
  args: {
    title: "Used space",
    priority: "high",
    commentsCount: 1,
    subtasks: { done: 1, total: 9 },
    assignee: sampleUsers[0],
  },
}

// ---------------------------------------------------------------------------
// Long title — multiline wrap
// ---------------------------------------------------------------------------
export const LongTitle: Story = {
  args: {
    title: "Purchase of tables/chairs on MercadoLibre - Review office real estate market",
    priority: "high",
    commentsCount: 1,
    subtasks: { done: 1, total: 9 },
    assignee: sampleUsers[0],
  },
}

// ---------------------------------------------------------------------------
// Done state
// ---------------------------------------------------------------------------
export const Done: Story = {
  args: {
    title: "Completed task",
    priority: "high",
    commentsCount: 1,
    subtasks: { done: 9, total: 9 },
    assignee: sampleUsers[1],
    done: true,
  },
}

// ---------------------------------------------------------------------------
// No comments badge
// ---------------------------------------------------------------------------
export const NoComments: Story = {
  args: {
    title: "Task without comments",
    priority: "medium",
    subtasks: { done: 3, total: 5 },
  },
}

// ---------------------------------------------------------------------------
// All priorities
// ---------------------------------------------------------------------------
export const AllPriorities: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <KanbanCard title="Critical priority" priority="critical" subtasks={{ done: 0, total: 3 }} users={sampleUsers} />
      <KanbanCard title="High priority" priority="high" subtasks={{ done: 1, total: 5 }} users={sampleUsers} />
      <KanbanCard title="Medium priority" priority="medium" subtasks={{ done: 2, total: 4 }} users={sampleUsers} />
      <KanbanCard title="Low priority" priority="low" subtasks={{ done: 4, total: 6 }} users={sampleUsers} />
    </div>
  ),
}

// ---------------------------------------------------------------------------
// Full showcase — default vs done side by side
// ---------------------------------------------------------------------------
export const Showcase: Story = {
  render: () => (
    <div className="flex gap-6">
      <KanbanCard
        title="Purchase of tables/chairs on MercadoLibre - Review office real estate market"
        commentsCount={1}
        priority="high"
        subtasks={{ done: 1, total: 9 }}
        assignee={sampleUsers[0]}
        users={sampleUsers}
      />
      <KanbanCard
        title="Completed task"
        commentsCount={1}
        priority="high"
        subtasks={{ done: 9, total: 9 }}
        assignee={sampleUsers[1]}
        users={sampleUsers}
        done
      />
      <KanbanCard
        title="No priority assigned"
        subtasks={{ done: 2, total: 7 }}
        users={sampleUsers}
      />
    </div>
  ),
}
