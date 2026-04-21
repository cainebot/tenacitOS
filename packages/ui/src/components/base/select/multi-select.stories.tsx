import type { Meta, StoryObj } from "@storybook/react"
import type { SelectItemType } from "./select-shared"
import { MultiSelect } from "./multi-select"
import { SelectItem } from "./select-item"

const items: SelectItemType[] = [
  { id: "product", label: "Product" },
  { id: "design", label: "Design" },
  { id: "marketing", label: "Marketing" },
  { id: "engineering", label: "Engineering" },
  { id: "support", label: "Support" },
]

const meta: Meta<typeof MultiSelect> = {
  title: "Base/MultiSelect",
  component: MultiSelect,
  tags: ["autodocs"],
  args: {
    placeholder: "Pick teams",
    size: "md",
    items,
    children: (item: SelectItemType) => <SelectItem id={item.id} label={item.label} />,
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    label: { control: "text" },
    hint: { control: "text" },
    children: { table: { disable: true } },
  },
}

export default meta
type Story = StoryObj<typeof MultiSelect>

export const Default: Story = {}

export const WithLabel: Story = {
  args: { label: "Teams", placeholder: "Pick teams" },
}

export const WithHint: Story = {
  args: { label: "Teams", hint: "You can pick multiple" },
}
