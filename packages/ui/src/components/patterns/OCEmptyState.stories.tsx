import type { Meta, StoryObj } from "@storybook/react"
import { OCEmptyState } from "./OCEmptyState"

const meta: Meta<typeof OCEmptyState> = {
  title: "Patterns/OCEmptyState",
  component: OCEmptyState,
  tags: ["autodocs"],
}

export default meta

type Story = StoryObj<typeof OCEmptyState>

export const Default: Story = {
  args: {
    title: "No cron jobs yet",
    description: "Create your first scheduled job to automate recurring tasks.",
    actionLabel: "Create Cron Job",
    onAction: () => alert("Create"),
  },
}

export const WithSecondary: Story = {
  args: {
    title: "No boards found",
    description: "Get started by creating a board or importing from a template.",
    actionLabel: "Create Board",
    secondaryActionLabel: "Import Template",
  },
}

export const Minimal: Story = {
  args: {
    title: "No results",
    description: "Try adjusting your search or filters.",
  },
}
