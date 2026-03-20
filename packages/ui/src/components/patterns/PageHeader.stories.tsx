import type { Meta, StoryObj } from "@storybook/react"
import { PageHeader } from "./PageHeader"
import { Button } from "../base/button"

const meta: Meta<typeof PageHeader> = {
  title: "Patterns/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
}

export default meta

type Story = StoryObj<typeof PageHeader>

export const Simple: Story = {
  args: {
    title: "Cron Jobs",
    description: "Manage scheduled tasks and recurring jobs.",
  },
}

export const WithBreadcrumbs: Story = {
  args: {
    title: "Agent Details",
    description: "View and configure agent settings.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Agents", href: "/agents" },
      { label: "Agent Alpha" },
    ],
    actions: (
      <>
        <Button variant="outline" size="sm">Settings</Button>
        <Button size="sm">Deploy</Button>
      </>
    ),
  },
}
