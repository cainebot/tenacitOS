import type { Meta, StoryObj } from "@storybook/react"
import { TableActions } from "./TableActions"

const meta: Meta<typeof TableActions> = {
  title: "Patterns/TableActions",
  component: TableActions,
  tags: ["autodocs"],
}

export default meta

type Story = StoryObj<typeof TableActions>

export const Default: Story = {
  args: {
    actions: [
      { key: "edit", label: "Edit" },
      { key: "duplicate", label: "Duplicate" },
      { key: "delete", label: "Delete", variant: "danger" },
    ],
  },
}

export const IconsOnly: Story = {
  args: {
    actions: [
      { key: "view", label: "View", variant: "ghost" },
      { key: "edit", label: "Edit", variant: "ghost" },
      { key: "delete", label: "Delete", variant: "danger" },
    ],
    size: "xs",
  },
}
