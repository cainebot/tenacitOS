import type { Meta, StoryObj } from "@storybook/react"
import { MetricCard } from "./MetricCard"

const meta: Meta<typeof MetricCard> = {
  title: "Patterns/MetricCard",
  component: MetricCard,
  tags: ["autodocs"],
}

export default meta

type Story = StoryObj<typeof MetricCard>

export const TrendUp: Story = {
  args: {
    label: "Total Agents",
    value: 24,
    trend: { value: "+12%", direction: "up" },
    badge: { label: "Active", variant: "success" },
  },
}

export const TrendDown: Story = {
  args: {
    label: "Error Rate",
    value: "3.2%",
    trend: { value: "+0.5%", direction: "down" },
    badge: { label: "Warning", variant: "warning" },
  },
}

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <MetricCard label="Active Cards" value={156} trend={{ value: "+8%", direction: "up" }} />
      <MetricCard label="Cron Jobs" value={12} badge={{ label: "Running", variant: "success" }} />
      <MetricCard label="API Calls" value="4.2K" trend={{ value: "-3%", direction: "down" }} />
    </div>
  ),
}
