import type { Meta, StoryObj } from "@storybook/react"
import { RatingStars, StarIcon } from "./rating-stars"

const meta: Meta<typeof RatingStars> = {
  title: "Foundations/RatingStars",
  component: RatingStars,
  tags: ["autodocs"],
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/design/MBkN7H8nYLx7DNhzTf8vcD/",
    },
  },
}

export default meta
type Story = StoryObj<typeof RatingStars>

export const Default: Story = { args: { rating: 4.5 } }
export const Full: Story = { args: { rating: 5 } }
export const Half: Story = { args: { rating: 3.5 } }
export const Empty: Story = { args: { rating: 0 } }

export const SingleStar: StoryObj<typeof StarIcon> = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <StarIcon progress={100} className="size-6 text-fg-warning-primary" />
      <StarIcon progress={50} className="size-6 text-fg-warning-primary" />
      <StarIcon progress={0} className="size-6 text-fg-disabled" />
    </div>
  ),
}
