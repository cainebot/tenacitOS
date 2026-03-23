import type { Meta, StoryObj } from "@storybook/react"
import { HomeLine, SearchLg } from "@untitledui/icons"
import { PageHeader } from "./PageHeader"
import { Button } from "../base/buttons/button"
import { Input } from "../base/input/input"

const meta: Meta<typeof PageHeader> = {
  title: "Patterns/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
}

export default meta

type Story = StoryObj<typeof PageHeader>

export const Simple: Story = {
  args: {
    title: "Team members",
    description: "Manage your team members and their account permissions here.",
  },
}

export const WithActions: Story = {
  args: {
    title: "Team members",
    description: "Manage your team members and their account permissions here.",
    actions: (
      <>
        <Button color="secondary" size="md">
          Secondary
        </Button>
        <Button size="md">Primary</Button>
      </>
    ),
  },
}

export const WithBreadcrumbs: Story = {
  args: {
    title: "Agent Details",
    description: "View and configure agent settings.",
    breadcrumbs: [
      { icon: HomeLine, href: "/" },
      { label: "Agents", href: "/agents" },
      { label: "Agent Alpha" },
    ],
    actions: (
      <>
        <Button color="tertiary" size="md">
          Settings
        </Button>
        <Button size="md">Deploy</Button>
      </>
    ),
  },
}

export const WithSearch: Story = {
  args: {
    title: "Projects",
    description: "Browse and manage your projects.",
    breadcrumbs: [
      { icon: HomeLine, href: "/" },
      { label: "Projects" },
    ],
    actions: (
      <>
        <Button color="secondary" size="md">
          Import
        </Button>
        <Button size="md">New Project</Button>
      </>
    ),
    extra: (
      <Input
        className="w-full md:max-w-80"
        size="sm"
        aria-label="Search"
        placeholder="Search"
        icon={SearchLg}
      />
    ),
  },
}

export const NoBorder: Story = {
  args: {
    title: "Settings",
    description: "Configure your workspace.",
    bordered: false,
  },
}
