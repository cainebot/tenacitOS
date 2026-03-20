import type { Meta, StoryObj } from "@storybook/react"
import { FilterBar } from "./FilterBar"
import { Button } from "../base/button"

const meta: Meta<typeof FilterBar> = {
  title: "Patterns/FilterBar",
  component: FilterBar,
  tags: ["autodocs"],
}

export default meta

type Story = StoryObj<typeof FilterBar>

export const Default: Story = {
  args: {
    searchPlaceholder: "Search boards...",
    onSearchChange: () => {},
    filters: [
      {
        key: "status",
        label: "Status",
        options: [
          { id: "active", label: "Active" },
          { id: "archived", label: "Archived" },
          { id: "draft", label: "Draft" },
        ],
      },
      {
        key: "type",
        label: "Type",
        options: [
          { id: "kanban", label: "Kanban" },
          { id: "list", label: "List" },
        ],
      },
    ],
    toggles: [
      { key: "favorites", label: "Favorites only" },
    ],
    actions: <Button size="sm">New Board</Button>,
  },
}

export const SearchOnly: Story = {
  args: {
    searchPlaceholder: "Search skills...",
    onSearchChange: () => {},
  },
}
