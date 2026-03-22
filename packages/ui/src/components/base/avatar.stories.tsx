import type { Meta, StoryObj } from "@storybook/react"
import { Avatar, AvatarLabelGroup } from "./avatar"

const meta: Meta<typeof Avatar> = {
  title: "Base/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  argTypes: {
    badge: { control: false },
    placeholder: { control: false },
    placeholderIcon: { control: false },
  },
}

export default meta
type Story = StoryObj<typeof Avatar>

export const Default: Story = {
  args: {
    initials: "JD",
    size: "md",
    contrastBorder: false
  },
}

export const WithImage: Story = {
  args: {
    src: "/avatars/olivia-rhye.webp",
    alt: "Olivia Rhye",
    size: "md",
  },
}

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      {(["xs", "sm", "md", "lg", "xl", "2xl"] as const).map((size) => (
        <Avatar key={size} src="/avatars/phoenix-baker.webp" alt="Phoenix Baker" size={size} />
      ))}
    </div>
  ),
}

export const Online: Story = {
  args: {
    src: "/avatars/demi-wilkinson.webp",
    alt: "Demi Wilkinson",
    size: "md",
    status: "online",
  },
}

export const Offline: Story = {
  args: {
    src: "/avatars/drew-cano.webp",
    alt: "Drew Cano",
    size: "md",
    status: "offline",
  },
}

export const LabelGroup: Story = {
  render: () => (
    <AvatarLabelGroup
      src="/avatars/olivia-rhye.webp"
      title="Olivia Rhye"
      subtitle="olivia@untitledui.com"
      size="md"
    />
  ),
}
