import type { Meta, StoryObj } from "@storybook/react"
import { Mail01, User01, SearchLg, HelpCircle, Globe01, Flag01 } from "@untitledui/icons"
import { Select, type SelectItemType } from "./select/select"
import { SelectItem } from "./select/select-item"

const iconMap: Record<string, typeof Mail01 | undefined> = {
  None: undefined,
  Mail01,
  User01,
  SearchLg,
  HelpCircle,
  Globe01,
  Flag01,
}

const items: SelectItemType[] = [
  { id: "1", label: "Option 1" },
  { id: "2", label: "Option 2" },
  { id: "3", label: "Option 3" },
]

const itemsWithIcons: SelectItemType[] = [
  { id: "1", label: "Email", icon: Mail01, supportingText: "olivia@example.com" },
  { id: "2", label: "Profile", icon: User01, supportingText: "View profile" },
  { id: "3", label: "Search", icon: SearchLg, supportingText: "Find items" },
]

const itemsWithAvatars: SelectItemType[] = [
  { id: "1", label: "Olivia Rhye", avatarUrl: "https://i.pravatar.cc/150?u=olivia", supportingText: "olivia@example.com" },
  { id: "2", label: "Phoenix Baker", avatarUrl: "https://i.pravatar.cc/150?u=phoenix", supportingText: "phoenix@example.com" },
  { id: "3", label: "Lana Steiner", avatarUrl: "https://i.pravatar.cc/150?u=lana", supportingText: "lana@example.com" },
]

const renderItems = (item: SelectItemType) => (
  <SelectItem id={item.id} label={item.label} icon={item.icon} supportingText={item.supportingText} avatarUrl={item.avatarUrl} />
)

const itemSets: Record<string, SelectItemType[]> = {
  "Simple": items,
  "With Icons": itemsWithIcons,
  "With Avatars": itemsWithAvatars,
}

const meta: Meta<typeof Select> = {
  title: "Base/Select",
  component: Select,
  tags: ["autodocs"],
  args: {
    placeholder: "Select an option",
    size: "sm",
    isDisabled: false,
    isRequired: false,
    items,
    children: renderItems,
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    placeholder: { control: "text" },
    label: { control: "text" },
    hint: { control: "text" },
    tooltip: { control: "text" },
    isDisabled: { control: "boolean" },
    isRequired: { control: "boolean" },
    icon: {
      control: "select",
      options: Object.keys(iconMap),
      mapping: iconMap,
    },
    items: {
      control: "select",
      options: Object.keys(itemSets),
      mapping: itemSets,
    },
    children: { table: { disable: true } },
  },
}

export default meta
type Story = StoryObj<typeof Select>

export const Default: Story = {}

export const WithLabel: Story = {
  args: { label: "Team member", placeholder: "Select member" },
}

export const Disabled: Story = {
  args: { label: "Team member", placeholder: "Select member", isDisabled: true },
}

export const WithIcon: Story = {
  args: { label: "Country", placeholder: "Select country", icon: Globe01 },
}

export const WithIcons: Story = {
  args: { label: "Action", placeholder: "Select action", items: itemsWithIcons },
}

export const WithAvatars: Story = {
  args: { label: "Assign to", placeholder: "Select member", items: itemsWithAvatars },
}

export const WithHint: Story = {
  args: { label: "Priority", placeholder: "Select priority", hint: "Choose the task priority level" },
}

export const Required: Story = {
  args: { label: "Status", placeholder: "Select status", isRequired: true },
}

export const MediumSize: Story = {
  args: { label: "Assign to", placeholder: "Select member", size: "md", items: itemsWithAvatars },
}
