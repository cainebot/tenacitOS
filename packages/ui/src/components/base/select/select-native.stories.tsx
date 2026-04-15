import type { Meta, StoryObj } from "@storybook/react"
import { NativeSelect } from "./select-native"

const options = [
  { value: "draft", label: "Draft" },
  { value: "in-review", label: "In review" },
  { value: "published", label: "Published" },
]

const meta: Meta<typeof NativeSelect> = {
  title: "Base/NativeSelect",
  component: NativeSelect,
  tags: ["autodocs"],
  args: {
    options,
    size: "md",
    label: "Status",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
}

export default meta
type Story = StoryObj<typeof NativeSelect>

export const Default: Story = {}

export const WithHint: Story = {
  args: { hint: "Choose a publication status" },
}
