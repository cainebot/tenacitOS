import type { Meta, StoryObj } from "@storybook/react"
import type { SelectItemType } from "./select-shared"
import { TagSelect } from "./tag-select"
import { SelectItem } from "./select-item"

const items: SelectItemType[] = [
  { id: "react", label: "React" },
  { id: "vue", label: "Vue" },
  { id: "svelte", label: "Svelte" },
  { id: "angular", label: "Angular" },
  { id: "solid", label: "Solid" },
]

const meta: Meta<typeof TagSelect> = {
  title: "Base/TagSelect",
  component: TagSelect,
  tags: ["autodocs"],
  args: {
    placeholder: "Add tags",
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
type Story = StoryObj<typeof TagSelect>

export const Default: Story = {}

export const WithLabel: Story = {
  args: { label: "Frameworks" },
}
