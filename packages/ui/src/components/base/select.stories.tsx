import type { Meta, StoryObj } from "@storybook/react"
import { Select, type SelectItemType } from "./select/select"
import { SelectItem } from "./select/select-item"

const items: SelectItemType[] = [
  { id: "1", label: "Option 1" },
  { id: "2", label: "Option 2" },
  { id: "3", label: "Option 3" },
]

const meta: Meta<typeof Select> = {
  title: "Base/Select",
  component: Select,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Select>

export const Default: Story = {
  args: {
    placeholder: "Select an option",
    items,
    children: (item: SelectItemType) => (
      <SelectItem id={item.id} label={item.label} />
    ),
  },
}

export const WithLabel: Story = {
  args: {
    label: "Team member",
    placeholder: "Select member",
    items,
    children: (item: SelectItemType) => (
      <SelectItem id={item.id} label={item.label} />
    ),
  },
}

export const Disabled: Story = {
  args: {
    label: "Team member",
    placeholder: "Select member",
    isDisabled: true,
    items,
    children: (item: SelectItemType) => (
      <SelectItem id={item.id} label={item.label} />
    ),
  },
}
