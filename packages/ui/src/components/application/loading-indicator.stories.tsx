import type { Meta, StoryObj } from "@storybook/react"
import { LoadingIndicator } from "./index"

const meta: Meta<typeof LoadingIndicator> = {
  title: "Application/LoadingIndicator",
  component: LoadingIndicator,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
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

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-12">
      {(["sm", "md", "lg"] as const).map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <LoadingIndicator size={size} />
          <span className="text-sm text-tertiary">{size}</span>
        </div>
      ))}
    </div>
  ),
}
