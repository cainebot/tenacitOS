import type { Meta, StoryObj } from "@storybook/react"
import { Toggle } from "./toggle"

const meta: Meta<typeof Toggle> = {
  title: "Base/Toggle",
  component: Toggle,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Toggle>

export const Default: Story = {
  args: {
    label: "Notifications",
  },
}

export const Selected: Story = {
  args: {
    label: "Notifications",
    defaultSelected: true,
  },
}

export const Disabled: Story = {
  args: {
    label: "Notifications",
    isDisabled: true,
  },
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, flexDirection: "column" }}>
      <Toggle size="sm" label="Small toggle" />
      <Toggle size="md" label="Medium toggle" />
    </div>
  ),
}

export const WithHint: Story = {
  args: {
    label: "Dark mode",
    hint: "Switch between light and dark themes",
  },
}
