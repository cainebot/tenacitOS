import type { Meta, StoryObj } from "@storybook/react"
import { DynamicFilter, defaultFilterFields } from "./dynamic-filter"
import { ChevronUp } from "@untitledui/icons"

const sampleUsers = [
  { id: "1", name: "Olivia Rhye", avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces" },
  { id: "2", name: "Phoenix Baker", avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces" },
  { id: "3", name: "Lana Steiner", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces" },
]

const fieldsWithMembers = defaultFilterFields.map((f) =>
  f.type === "member"
    ? { ...f, values: sampleUsers.map((u) => ({ id: u.id, label: u.name, avatarUrl: u.avatarUrl })) }
    : f,
)

const meta: Meta<typeof DynamicFilter> = {
  title: "Application/DynamicFilter",
  component: DynamicFilter,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    fields: fieldsWithMembers,
  },
  argTypes: {
    fields: { table: { disable: true } },
    filters: { table: { disable: true } },
    onFiltersChange: { table: { disable: true } },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithFilters: Story = {
  args: {
    filters: [
      { id: "1", fieldType: "member", operator: "equal", value: "1" },
      { id: "2", fieldType: "priority", operator: "equal", value: "high" },
    ],
  },
}
