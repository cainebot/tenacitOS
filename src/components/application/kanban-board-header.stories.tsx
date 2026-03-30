import type { Meta, StoryObj } from "@storybook/react"
import { KanbanBoardHeader } from "./kanban-board-header"
import { defaultFilterFields } from "./dynamic-filter"

const sampleUsers = [
  { id: "1", name: "Olivia Rhye", avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces" },
  { id: "2", name: "Phoenix Baker", avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces" },
  { id: "3", name: "Lana Steiner", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces" },
]

const fieldsWithMembers = defaultFilterFields.map((f) =>
  f.type === "member"
    ? { ...f, values: sampleUsers.map((u) => ({ id: u.id, label: u.name, avatarUrl: u.avatarUrl })) }
    : f,
)

const meta: Meta<typeof KanbanBoardHeader> = {
  title: "Application/KanbanBoardHeader",
  component: KanbanBoardHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    filterFields: fieldsWithMembers,
  },
  argTypes: {
    filterFields: { table: { disable: true } },
    filters: { table: { disable: true } },
    onFiltersChange: { table: { disable: true } },
    onAddTask: { table: { disable: true } },
    onSortChange: { table: { disable: true } },
    onSearchChange: { table: { disable: true } },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithFilters: Story = {
  args: {
    filters: [
      { id: "1", fieldType: "priority", operator: "equal", value: "high" },
    ],
  },
}
