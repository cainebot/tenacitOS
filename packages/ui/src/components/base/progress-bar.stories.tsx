import type { Meta, StoryObj } from "@storybook/react"
import { ProgressBar } from "./index"

const meta: Meta<typeof ProgressBar> = {
  title: "Base/ProgressBar",
  component: ProgressBar,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof ProgressBar>

export const Default: Story = {
  args: {
    value: 60,
    labelPosition: "right",
  },
}

export const Complete: Story = {
  args: {
    value: 100,
    labelPosition: "right",
  },
}

export const Zero: Story = {
  args: {
    value: 0,
    labelPosition: "right",
  },
}

export const LabelPositions: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 400 }}>
      <ProgressBar value={45} labelPosition="right" />
      <ProgressBar value={45} labelPosition="bottom" />
    </div>
  ),
}
