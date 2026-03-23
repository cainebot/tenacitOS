import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { MemberSelector } from "./member-selector"

const USERS = [
  { id: "1", name: "Olivia Rhye", handle: "@olivia", avatarUrl: "/avatars/Olivia Rhye.webp" },
  { id: "2", name: "Phoenix Baker", handle: "@phoenix", avatarUrl: "/avatars/Phoenix Baker.webp" },
  { id: "3", name: "Lana Steiner", handle: "@lana", avatarUrl: "/avatars/Lana Steiner.webp" },
  { id: "4", name: "Demi Wilkinson", handle: "@demi", avatarUrl: "/avatars/Demi Wilkinson.webp" },
  { id: "5", name: "Candice Wu", handle: "@candice", avatarUrl: "/avatars/Candice Wu.webp" },
  { id: "6", name: "Natali Craig", handle: "@natali", avatarUrl: "/avatars/Natali Craig.webp" },
]

const meta: Meta<typeof MemberSelector> = {
  title: "Patterns/MemberSelector",
  component: MemberSelector,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
}

export default meta

type Story = StoryObj<typeof MemberSelector>

export const Default: Story = {
  args: {
    users: USERS,
    label: "Members",
  },
}

export const WithPreselected: Story = {
  args: {
    users: USERS,
    selected: ["1", "3"],
    label: "Members",
  },
}

export const Controlled: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [selected, setSelected] = useState<string[]>([])
    return (
      <div className="flex flex-col gap-4">
        <MemberSelector users={USERS} selected={selected} onChange={setSelected} label="Assignees" />
        <p className="text-sm text-tertiary">
          Selected: {selected.length ? USERS.filter((u) => selected.includes(u.id)).map((u) => u.name).join(", ") : "none"}
        </p>
      </div>
    )
  },
}

export const CustomLabel: Story = {
  args: {
    users: USERS,
    label: "Assignees",
  },
}
