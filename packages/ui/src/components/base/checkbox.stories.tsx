import type { Meta, StoryObj } from "@storybook/react"
import { Checkbox } from "./index"

const meta: Meta<typeof Checkbox> = {
  title: "Base/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  argTypes: {
    hint: { control: "text" },
    label: { control: "text" },
    ref: { table: { disable: true } },
  },
}

export default meta
type Story = StoryObj<typeof Checkbox>

export const Default: Story = {
  args: {
    label: "Accept terms",
  },
}

export const WithHint: Story = {
  args: {
    label: "Newsletter",
    hint: "Receive weekly updates",
  },
}

export const Disabled: Story = {
  args: {
    label: "Accept terms",
    isDisabled: true,
  },
}

export const Indeterminate: Story = {
  args: {
    label: "Select all",
    isIndeterminate: true,
    isSelected: true,
  },
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <Checkbox size="sm" label="Small" />
      <Checkbox size="md" label="Medium" />
    </div>
  ),
}
