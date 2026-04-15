import type { Meta, StoryObj } from "@storybook/react"
import { ProgressBarCircle, ProgressBarHalfCircle } from "./progress-circles"
import { CircleProgressBar } from "./simple-circle"

const meta: Meta<typeof ProgressBarCircle> = {
  title: "Base/ProgressCircles",
  component: ProgressBarCircle,
  tags: ["autodocs"],
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/design/MBkN7H8nYLx7DNhzTf8vcD/",
    },
  },
}

export default meta
type Story = StoryObj<typeof ProgressBarCircle>

export const FullCircle: Story = { args: { value: 65, size: "md", label: "Progress" } }
export const HalfCircle: StoryObj<typeof ProgressBarHalfCircle> = {
  render: (args) => <ProgressBarHalfCircle {...args} />,
  args: { value: 40, size: "md", label: "Half" },
}
export const Simple: StoryObj<typeof CircleProgressBar> = {
  render: (args) => <CircleProgressBar {...args} />,
  args: { value: 75 },
}
