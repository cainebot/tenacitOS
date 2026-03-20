import type { Meta, StoryObj } from "@storybook/react"
import { Timeline, TimelineItem } from "./TimelineItem"
import { Badge } from "../base/badge"

const meta: Meta<typeof TimelineItem> = {
  title: "Patterns/TimelineItem",
  component: TimelineItem,
  tags: ["autodocs"],
}

export default meta

type Story = StoryObj<typeof TimelineItem>

export const Default: Story = {
  args: {
    title: "Card moved to Done",
    description: "Agent Alpha completed the task",
    timestamp: "2 min ago",
  },
}

export const ActivityFeed: Story = {
  render: () => (
    <Timeline>
      <TimelineItem
        title="Board created"
        description="Sprint 42 board was created"
        timestamp="5 min ago"
        trailing={<Badge variant="success" size="sm">New</Badge>}
      />
      <TimelineItem
        title="Card assigned"
        description="Build Frontend assigned to Agent Alpha"
        timestamp="10 min ago"
      />
      <TimelineItem
        title="Cron job triggered"
        description="daily-sync ran successfully"
        timestamp="1 hour ago"
      />
      <TimelineItem
        title="System started"
        description="Control panel initialized"
        timestamp="3 hours ago"
        isLast
      />
    </Timeline>
  ),
}
