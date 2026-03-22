import type { Meta, StoryObj } from "@storybook/react"
import { BackgroundPattern } from "./background-patterns"

const meta: Meta<typeof BackgroundPattern> = {
  title: "SharedAssets/BackgroundPattern",
  component: BackgroundPattern,
  tags: ["autodocs"],
  argTypes: {
    pattern: {
      control: "select",
      options: ["circle", "square", "grid", "grid-check"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
  decorators: [
    (Story) => (
      <div className="relative flex h-96 w-full items-center justify-center overflow-hidden bg-primary">
        <Story />
        <span className="relative z-10 text-lg font-semibold text-primary">Content on top</span>
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof BackgroundPattern>

export const Grid: Story = {
  args: {
    pattern: "grid",
    className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  },
}

export const GridMedium: Story = {
  args: {
    pattern: "grid",
    size: "md",
    className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  },
}

export const Circle: Story = {
  args: {
    pattern: "circle",
    className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  },
}

export const Square: Story = {
  args: {
    pattern: "square",
    className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  },
}

export const GridCheck: Story = {
  args: {
    pattern: "grid-check",
    className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  },
}

export const AllPatterns: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {(["grid", "circle", "square", "grid-check"] as const).map((pattern) => (
        <div key={pattern} className="relative flex h-48 items-center justify-center overflow-hidden rounded-lg border border-secondary bg-primary">
          <BackgroundPattern pattern={pattern} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <span className="relative z-10 text-sm font-medium text-primary">{pattern}</span>
        </div>
      ))}
    </div>
  ),
}
