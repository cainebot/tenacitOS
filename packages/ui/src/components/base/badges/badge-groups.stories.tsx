import type { Meta, StoryObj } from "@storybook/react"
import { BadgeGroup } from "./badge-groups"

const meta: Meta<typeof BadgeGroup> = {
  title: "Base/BadgeGroup",
  component: BadgeGroup,
  tags: ["autodocs"],
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/design/MBkN7H8nYLx7DNhzTf8vcD/",
    },
  },
}

export default meta
type Story = StoryObj<typeof BadgeGroup>

export const Default: Story = { args: { addonText: "New", children: "You are invited!" } }
export const Brand: Story = { args: { color: "brand", addonText: "Beta", children: "Try the new feature" } }
export const Success: Story = { args: { color: "success", addonText: "Live", children: "API available" } }
