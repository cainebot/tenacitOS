import type { Meta, StoryObj } from "@storybook/react"
import { ButtonGroup, ButtonGroupItem } from "./button-group"

const meta: Meta<typeof ButtonGroup> = {
  title: "Base/ButtonGroup",
  component: ButtonGroup,
  tags: ["autodocs"],
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/design/MBkN7H8nYLx7DNhzTf8vcD/",
    },
  },
}

export default meta
type Story = StoryObj<typeof ButtonGroup>

export const Default: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <ButtonGroupItem id="left">Left</ButtonGroupItem>
      <ButtonGroupItem id="middle">Middle</ButtonGroupItem>
      <ButtonGroupItem id="right">Right</ButtonGroupItem>
    </ButtonGroup>
  ),
}
export const Small: Story = { ...Default, args: { size: "sm" } }
export const Large: Story = { ...Default, args: { size: "lg" } }
