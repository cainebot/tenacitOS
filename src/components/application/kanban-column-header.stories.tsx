import type { Meta, StoryObj } from "@storybook/react"
import { KanbanColumnHeader } from "./kanban-column-header"

const meta: Meta<typeof KanbanColumnHeader> = {
  title: "Application/KanbanColumnHeader",
  component: KanbanColumnHeader,
  tags: ["autodocs"],
  args: {
    title: "Tareas pendientes",
    count: 6,
  },
  argTypes: {
    active: { control: "boolean" },
    onlyHumans: { control: "boolean" },
    count: { control: "number" },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Default — gray bg, no actions visible
// ---------------------------------------------------------------------------
export const Default: Story = {}

// ---------------------------------------------------------------------------
// Active — brand border, for drag & drop column reorder
// ---------------------------------------------------------------------------
export const Active: Story = {
  args: {
    active: true,
  },
}

// ---------------------------------------------------------------------------
// No count badge
// ---------------------------------------------------------------------------
export const NoCount: Story = {
  args: {
    count: undefined,
  },
}

// ---------------------------------------------------------------------------
// Only humans toggle on
// ---------------------------------------------------------------------------
export const OnlyHumans: Story = {
  args: {
    onlyHumans: true,
  },
}

// ---------------------------------------------------------------------------
// Long title — truncation
// ---------------------------------------------------------------------------
export const LongTitle: Story = {
  args: {
    title: "Tareas pendientes de revisión por el equipo",
  },
}
