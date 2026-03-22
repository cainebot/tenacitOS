import type { Meta, StoryObj } from "@storybook/react"
import { LoadingIndicator } from "./index"

const meta: Meta<typeof LoadingIndicator> = {
  title: "Application/LoadingIndicator",
  component: LoadingIndicator,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl"],
    },
    type: {
      control: "select",
      options: ["line-simple", "line-spinner", "dot-circle"],
    },
  },
}

export default meta

type Story = StoryObj<typeof LoadingIndicator>

export const Default: Story = {}

export const WithLabel: Story = {
  args: {
    label: "Loading...",
    size: "md",
  },
}

export const AllTypes: Story = {
  render: () => (
    <div className="flex items-end gap-12">
      <div className="flex flex-col items-center gap-2">
        <LoadingIndicator type="line-simple" size="md" />
        <span className="text-sm text-tertiary">line-simple</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <LoadingIndicator type="line-spinner" size="md" />
        <span className="text-sm text-tertiary">line-spinner</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <LoadingIndicator type="dot-circle" size="md" />
        <span className="text-sm text-tertiary">dot-circle</span>
      </div>
    </div>
  ),
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-12">
      {(["sm", "md", "lg", "xl"] as const).map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <LoadingIndicator size={size} />
          <span className="text-sm text-tertiary">{size}</span>
        </div>
      ))}
    </div>
  ),
}
