import type { Meta, StoryObj } from "@storybook/react"
import { AgentListItem } from "./AgentListItem"

const meta: Meta<typeof AgentListItem> = {
  title: "Patterns/AgentListItem",
  component: AgentListItem,
  tags: ["autodocs"],
  argTypes: {
    active: { control: "boolean", description: "Active/selected state" },
    badgeColor: {
      control: "select",
      options: ["success", "brand", "error", "warning", "gray", "blue", "purple", "orange"],
      description: "Badge color",
    },
  },
}

export default meta
type Story = StoryObj<typeof AgentListItem>

export const Default: Story = {
  args: {
    name: "All agents",
    subtitle: "7 total",
    badgeText: "5 active",
    badgeColor: "success",
  },
}

export const Active: Story = {
  args: {
    name: "All agents",
    subtitle: "7 total",
    badgeText: "5 active",
    badgeColor: "success",
    active: true,
  },
}

export const NoBadge: Story = {
  args: {
    name: "Frontend team",
    subtitle: "3 agents",
  },
}

export const AgentList: Story = {
  render: () => (
    <div className="flex w-[225px] flex-col">
      <AgentListItem
        name="All agents"
        subtitle="7 total"
        badgeText="5 active"
        badgeColor="success"
        active
        onClick={() => {}}
      />
      <AgentListItem
        name="Frontend"
        subtitle="3 agents"
        badgeText="2 active"
        badgeColor="success"
        onClick={() => {}}
      />
      <AgentListItem
        name="Backend"
        subtitle="2 agents"
        badgeText="1 active"
        badgeColor="success"
        onClick={() => {}}
      />
      <AgentListItem
        name="Design"
        subtitle="2 agents"
        badgeText="0 active"
        badgeColor="gray"
        onClick={() => {}}
      />
    </div>
  ),
}
