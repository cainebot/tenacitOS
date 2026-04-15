import type { Meta, StoryObj } from "@storybook/react"
import { RatingBadge } from "./rating-badge"

const meta: Meta<typeof RatingBadge> = {
  title: "Foundations/RatingBadge",
  component: RatingBadge,
  tags: ["autodocs"],
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/design/MBkN7H8nYLx7DNhzTf8vcD/",
    },
  },
}

export default meta
type Story = StoryObj<typeof RatingBadge>

export const Default: Story = { args: { rating: 5, title: "Best Design Tool", subtitle: "2,000+ reviews", theme: "dark" } }
export const Light: Story = { args: { rating: 4.5, title: "Top Rated", subtitle: "500+ reviews", theme: "light" } }
