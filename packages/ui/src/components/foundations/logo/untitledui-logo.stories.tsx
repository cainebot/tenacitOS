import type { Meta, StoryObj } from "@storybook/react"
import { UntitledLogo } from "./untitledui-logo"

const meta: Meta<typeof UntitledLogo> = {
  title: "Foundations/UntitledLogo",
  component: UntitledLogo,
  tags: ["autodocs"],
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/design/MBkN7H8nYLx7DNhzTf8vcD/",
    },
  },
}

export default meta
type Story = StoryObj<typeof UntitledLogo>

export const Default: Story = {}
export const Large: Story = { args: { className: "h-16" } }
