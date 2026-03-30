import type { ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { KanbanCard, type KanbanCardTag } from "./kanban-card"

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

type StoryArgs = ComponentProps<typeof KanbanCard> & {
  subtasksDone?: number
  subtasksTotal?: number
  selectedTags?: string[]
}

const meta: Meta<StoryArgs> = {
  title: "Application/KanbanCard",
  component: KanbanCard,
  tags: ["autodocs"],
  render: ({ subtasksDone, subtasksTotal, selectedTags, ...args }) => {
    const subtasks = subtasksTotal ? { done: subtasksDone ?? 0, total: subtasksTotal } : undefined
    const tags = selectedTags?.length
      ? sampleTags.filter((t) => selectedTags.includes(t.label))
      : undefined
    return <KanbanCard {...args} subtasks={subtasks} tags={tags} />
  },
  args: {
    title: "Used space",
    size: "sm",
    users: sampleUsers,
    availableTags: sampleTags,
    subtasksDone: 1,
    subtasksTotal: 9,
    selectedTags: ["BackOffice"],
  },
  argTypes: {
    size: {
      control: "inline-radio",
      options: ["sm", "md"],
    },
    taskType: {
      control: "select",
      options: [undefined, "epic", "spike", "subtask", "story", "bug", "research", "task"],
    },
    priority: {
      control: "select",
      options: [undefined, "critical", "high", "medium", "low"],
    },
    done: { control: "boolean" },
    commentsCount: { control: "number" },
    assignee: {
      control: "select",
      options: [undefined, ...sampleUsers.map((u) => u.name)],
      mapping: { undefined, ...Object.fromEntries(sampleUsers.map((u) => [u.name, u])) },
    },
    tags: { table: { disable: true } },
    selectedTags: {
      control: "check",
      options: sampleTags.map((t) => t.label),
      description: "Select tags to display. None selected = no tags row.",
    },
    subtasks: { table: { disable: true } },
    subtasksDone: { control: { type: "number", min: 0 }, description: "Completed subtasks (left number)" },
    subtasksTotal: { control: { type: "number", min: 0 }, description: "Total subtasks (right number). Badge hidden when 0." },
    dueDate: { table: { disable: true } },
    availableTags: { table: { disable: true } },
    users: { table: { disable: true } },
    className: { table: { disable: true } },
    onTitleChange: { table: { disable: true } },
    onPriorityChange: { table: { disable: true } },
    onAssigneeChange: { table: { disable: true } },
    onDoneChange: { table: { disable: true } },
    onDueDateChange: { table: { disable: true } },
    onTagsChange: { table: { disable: true } },
    onTagCreate: { table: { disable: true } },
  },
}

export default meta
type Story = StoryObj<StoryArgs>

// ---------------------------------------------------------------------------
// Default — no priority, no assignee, no date
// ---------------------------------------------------------------------------
export const Default: Story = {
  args: {
    title: "Used space",
    taskType: "story",
    selectedTags: ["BackOffice"],
    subtasksDone: 1,
    subtasksTotal: 9,
  },
}

// ---------------------------------------------------------------------------
// With priority
// ---------------------------------------------------------------------------
export const WithPriority: Story = {
  args: {
    title: "Used space",
    taskType: "epic",
    selectedTags: ["BackOffice"],
    priority: "high",
    commentsCount: 1,
    subtasksDone: 1,
    subtasksTotal: 9,
  },
}

// ---------------------------------------------------------------------------
// With assignee
// ---------------------------------------------------------------------------
export const WithAssignee: Story = {
  args: {
    title: "Used space",
    taskType: "bug",
    selectedTags: ["Frontend", "Urgent"],
    priority: "high",
    commentsCount: 1,
    subtasksDone: 1,
    subtasksTotal: 9,
    assignee: sampleUsers[0],
  },
}

// ---------------------------------------------------------------------------
// Long title — multiline wrap
// ---------------------------------------------------------------------------
export const LongTitle: Story = {
  args: {
    title: "Purchase of tables/chairs on MercadoLibre - Review office real estate market",
    taskType: "task",
    selectedTags: ["Operations"],
    priority: "high",
    commentsCount: 1,
    subtasksDone: 1,
    subtasksTotal: 9,
    assignee: sampleUsers[0],
  },
}

// ---------------------------------------------------------------------------
// Done state
// ---------------------------------------------------------------------------
export const Done: Story = {
  args: {
    title: "Completed task",
    taskType: "task",
    selectedTags: ["BackOffice"],
    priority: "high",
    commentsCount: 1,
    subtasksDone: 9,
    subtasksTotal: 9,
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
    taskType: "research",
    selectedTags: ["Marketing"],
    priority: "medium",
    subtasksDone: 3,
    subtasksTotal: 5,
  },
}

// ---------------------------------------------------------------------------
// Size md
// ---------------------------------------------------------------------------
export const SizeMd: Story = {
  args: {
    title: "Used space",
    size: "md",
    taskType: "story",
    selectedTags: ["BackOffice"],
    priority: "high",
    commentsCount: 1,
    subtasksDone: 1,
    subtasksTotal: 9,
    assignee: sampleUsers[0],
  },
}

// ---------------------------------------------------------------------------
// All priorities
// ---------------------------------------------------------------------------
export const AllPriorities: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <KanbanCard title="Critical priority" taskType="bug" priority="critical" subtasks={{ done: 0, total: 3 }} users={sampleUsers} availableTags={sampleTags} />
      <KanbanCard title="High priority" taskType="epic" priority="high" subtasks={{ done: 1, total: 5 }} users={sampleUsers} availableTags={sampleTags} />
      <KanbanCard title="Medium priority" taskType="task" priority="medium" subtasks={{ done: 2, total: 4 }} users={sampleUsers} availableTags={sampleTags} />
      <KanbanCard title="Low priority" taskType="story" priority="low" subtasks={{ done: 4, total: 6 }} users={sampleUsers} availableTags={sampleTags} />
    </div>
  ),
}

// ---------------------------------------------------------------------------
// Full showcase — sm vs md side by side
// ---------------------------------------------------------------------------
export const Showcase: Story = {
  render: () => (
    <div className="flex gap-6">
      <KanbanCard
        title="Small card"
        size="sm"
        taskType="story"
        tags={[{ label: "BackOffice", color: "purple" }]}
        commentsCount={1}
        priority="high"
        subtasks={{ done: 1, total: 9 }}
        assignee={sampleUsers[0]}
        users={sampleUsers}
        availableTags={sampleTags}
      />
      <KanbanCard
        title="Medium card"
        size="md"
        taskType="epic"
        tags={[{ label: "Frontend", color: "blue" }]}
        commentsCount={2}
        priority="critical"
        subtasks={{ done: 3, total: 7 }}
        assignee={sampleUsers[1]}
        users={sampleUsers}
        availableTags={sampleTags}
      />
      <KanbanCard
        title="Done card"
        size="md"
        taskType="task"
        tags={[{ label: "DevOps", color: "gray-blue" }]}
        commentsCount={1}
        priority="high"
        subtasks={{ done: 9, total: 9 }}
        assignee={sampleUsers[2]}
        users={sampleUsers}
        availableTags={sampleTags}
        done
      />
    </div>
  ),
}
