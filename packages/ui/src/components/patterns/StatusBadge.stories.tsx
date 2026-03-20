import type { Meta, StoryObj } from "@storybook/react"
import { StatusBadge } from "./StatusBadge"

const meta: Meta<typeof StatusBadge> = {
  title: "Patterns/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs"],
}

export default meta

type Story = StoryObj<typeof StatusBadge>

export const Active: Story = {
  args: { status: "active", label: "Active" },
}

export const Pending: Story = {
  args: { status: "pending", label: "Pending" },
}

export const Error: Story = {
  args: { status: "error", label: "Failed" },
}

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StatusBadge status="active" label="Active" />
      <StatusBadge status="inactive" label="Inactive" />
      <StatusBadge status="pending" label="Pending" />
      <StatusBadge status="success" label="Success" />
      <StatusBadge status="warning" label="Warning" />
      <StatusBadge status="error" label="Error" />
      <StatusBadge status="info" label="Info" />
    </div>
  ),
}

export const WithoutDot: Story = {
  args: { status: "active", label: "Active", showDot: false },
}
