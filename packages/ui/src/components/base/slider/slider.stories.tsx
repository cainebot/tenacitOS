import type { Meta, StoryObj } from "@storybook/react"
import { Slider } from "./slider"

const meta: Meta<typeof Slider> = {
  title: "Base/Slider",
  component: Slider,
  tags: ["autodocs"],
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/design/MBkN7H8nYLx7DNhzTf8vcD/",
    },
  },
}

export default meta
type Story = StoryObj<typeof Slider>

export const Default: Story = { args: { defaultValue: 40, label: "Volume" } }
export const Range: Story = { args: { defaultValue: [20, 80], label: "Price range" } }
export const WithBottomLabel: Story = { args: { defaultValue: 60, label: "Zoom", labelPosition: "bottom" } }
