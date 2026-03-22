import type { Meta, StoryObj } from "@storybook/react"
import { Star01, Building07, User01, Users01, Mail01, Globe01 } from "@untitledui/icons"
import { Avatar, AvatarLabelGroup } from "./avatar"

type AvatarDisplay = "Initials" | "Image" | "Placeholder Icon" | "Default (User)"

const displayProps: Record<AvatarDisplay, Record<string, unknown>> = {
  Initials: { initials: "JD" },
  Image: { src: "/avatars/olivia-rhye.webp", alt: "Olivia Rhye" },
  "Placeholder Icon": { placeholderIcon: Star01 },
  "Default (User)": {},
}

const meta: Meta<typeof Avatar> = {
  title: "Base/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  argTypes: {
    // Custom arg to switch display mode
    initials: { table: { disable: true } },
    src: { table: { disable: true } },
    alt: { table: { disable: true } },
    badge: {
      options: ["None", "Online dot", "Offline dot", "Count"],
      mapping: {
        "None": undefined,
        "Online dot": <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-bg-primary bg-success-500" />,
        "Offline dot": <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-bg-primary bg-fg-disabled" />,
        "Count": <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-error-500 text-[10px] font-medium text-white">3</span>,
      },
      control: { type: "select" },
    },
    placeholderIcon: {
      options: ["None", "User01", "Star01", "Building07", "Users01", "Mail01", "Globe01"],
      mapping: { None: undefined, User01, Star01, Building07, Users01, Mail01, Globe01 },
      control: { type: "select" },
    },
    placeholder: {
      name: "placeholder (icon)",
      options: ["None", "User01", "Star01", "Building07", "Users01", "Mail01", "Globe01"],
      mapping: {
        None: undefined,
        User01: <User01 className="size-5 text-fg-quaternary" />,
        Star01: <Star01 className="size-5 text-fg-quaternary" />,
        Building07: <Building07 className="size-5 text-fg-quaternary" />,
        Users01: <Users01 className="size-5 text-fg-quaternary" />,
        Mail01: <Mail01 className="size-5 text-fg-quaternary" />,
        Globe01: <Globe01 className="size-5 text-fg-quaternary" />,
      },
      control: { type: "select" },
    },
  },
}

export default meta
type Story = StoryObj<typeof Avatar>

export const Default: Story = {
  argTypes: {
    initials: { table: { disable: false } },
    src: { table: { disable: false } },
    alt: { table: { disable: false } },
  },
  args: {
    initials: "JD",
    size: "md",
    contrastBorder: false,
  },
  render: ({ ...args }) => {
    const display = (args as any).display as AvatarDisplay | undefined
    const extra = display ? displayProps[display] : {}
    const { display: _, initials, src, alt, ...rest } = args as any
    return <Avatar {...rest} {...extra} />
  },
}

// Add custom display arg only to Default
Default.argTypes = {
  ...Default.argTypes,
  display: {
    options: ["Initials", "Image", "Placeholder Icon", "Default (User)"],
    control: { type: "select" },
    description: "Switch avatar display mode",
  },
  initials: { table: { disable: true } },
  src: { table: { disable: true } },
  alt: { table: { disable: true } },
}
Default.args = {
  ...Default.args,
  display: "Initials" as any,
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

export const WithPlaceholderIcon: Story = {
  args: {
    size: "md",
    placeholderIcon: Star01,
  },
}

export const WithPlaceholder: Story = {
  args: {
    size: "md",
    placeholder: "Building07" as any,
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
