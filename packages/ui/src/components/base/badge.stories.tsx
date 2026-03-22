import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import {
  ArrowRight,
  ArrowUp,
  Check,
  Plus,
  Star01,
  Zap,
} from "@untitledui/icons"
import {
  Badge,
  BadgeWithDot,
  BadgeWithIcon,
  BadgeWithButton,
  BadgeIcon,
} from "./badge"

const iconMap: Record<string, React.FC<{ className?: string }> | undefined> = {
  None: undefined,
  ArrowRight,
  ArrowUp,
  Check,
  Plus,
  Star01,
  Zap,
}
const iconOptions = Object.keys(iconMap)

const colorOptions = [
  "gray",
  "brand",
  "error",
  "warning",
  "success",
  "gray-blue",
  "blue-light",
  "blue",
  "indigo",
  "purple",
  "pink",
  "orange",
] as const

const typeOptions = ["pill-color", "color", "modern"] as const
const sizeOptions = ["sm", "md", "lg"] as const

// ---------------------------------------------------------------------------
// Badge (plain text)
// ---------------------------------------------------------------------------

const meta = {
  title: "Base/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    color: { control: "select", options: colorOptions },
    type: { control: "select", options: typeOptions },
    size: { control: "select", options: sizeOptions },
    children: { name: "Badge text", control: "text" },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    color: "gray",
    children: "Default",
  },
}

export const Brand: Story = {
  args: {
    color: "brand",
    children: "Brand",
  },
}

export const Success: Story = {
  args: {
    color: "success",
    children: "Success",
  },
}

export const Warning: Story = {
  args: {
    color: "warning",
    children: "Warning",
  },
}

export const Error: Story = {
  args: {
    color: "error",
    children: "Error",
  },
}

export const Blue: Story = {
  args: {
    color: "blue",
    children: "Blue",
  },
}

// ---------------------------------------------------------------------------
// BadgeWithDot
// ---------------------------------------------------------------------------

const dotMeta = {
  title: "Base/Badge/With Dot",
  component: BadgeWithDot,
  tags: ["autodocs"],
  argTypes: {
    color: { control: "select", options: colorOptions },
    type: { control: "select", options: typeOptions },
    size: { control: "select", options: sizeOptions },
    children: { name: "Badge text", control: "text" },
  },
} satisfies Meta<typeof BadgeWithDot>

type DotStory = StoryObj<typeof dotMeta>

export const Dot: DotStory = {
  args: {
    color: "success",
    children: "Active",
  },
  render: (args) => <BadgeWithDot {...args} />,
}

// ---------------------------------------------------------------------------
// BadgeWithIcon
// ---------------------------------------------------------------------------

const iconMeta = {
  title: "Base/Badge/With Icon",
  component: BadgeWithIcon,
  tags: ["autodocs"],
  argTypes: {
    color: { control: "select", options: colorOptions },
    type: { control: "select", options: typeOptions },
    size: { control: "select", options: sizeOptions },
    iconLeading: { control: "select", options: iconOptions, mapping: iconMap },
    iconTrailing: { control: "select", options: iconOptions, mapping: iconMap },
    children: { name: "Badge text", control: "text" },
  },
} satisfies Meta<typeof BadgeWithIcon>

type IconStory = StoryObj<typeof iconMeta>

export const IconLeading: IconStory = {
  args: {
    color: "brand",
    iconLeading: ArrowUp,
    children: "Badge",
  },
  render: (args) => <BadgeWithIcon {...args} />,
}

export const IconTrailing: IconStory = {
  args: {
    color: "brand",
    iconTrailing: ArrowRight,
    children: "Badge",
  },
  render: (args) => <BadgeWithIcon {...args} />,
}

// ---------------------------------------------------------------------------
// BadgeWithButton (x-close)
// ---------------------------------------------------------------------------

const buttonMeta = {
  title: "Base/Badge/With Button",
  component: BadgeWithButton,
  tags: ["autodocs"],
  argTypes: {
    color: { control: "select", options: colorOptions },
    type: { control: "select", options: typeOptions },
    size: { control: "select", options: sizeOptions },
    children: { name: "Badge text", control: "text" },
  },
} satisfies Meta<typeof BadgeWithButton>

type ButtonStory = StoryObj<typeof buttonMeta>

export const XClose: ButtonStory = {
  args: {
    color: "brand",
    children: "Dismiss",
  },
  render: (args) => <BadgeWithButton {...args} />,
}

// ---------------------------------------------------------------------------
// BadgeIcon (icon only)
// ---------------------------------------------------------------------------

const iconOnlyMeta = {
  title: "Base/Badge/Icon Only",
  component: BadgeIcon,
  tags: ["autodocs"],
  argTypes: {
    color: { control: "select", options: colorOptions },
    type: { control: "select", options: typeOptions },
    size: { control: "select", options: sizeOptions },
    icon: { control: "select", options: iconOptions, mapping: iconMap },
  },
} satisfies Meta<typeof BadgeIcon>

type IconOnlyStory = StoryObj<typeof iconOnlyMeta>

export const IconOnly: IconOnlyStory = {
  args: {
    color: "brand",
    icon: Plus,
  },
  render: (args) => <BadgeIcon {...args} />,
}

// ---------------------------------------------------------------------------
// Showcase stories
// ---------------------------------------------------------------------------

export const AllVariants: Story = {
  args: { children: "All" },
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <Badge color="gray">Gray</Badge>
      <Badge color="brand">Brand</Badge>
      <Badge color="success">Success</Badge>
      <Badge color="warning">Warning</Badge>
      <Badge color="error">Error</Badge>
      <Badge color="blue">Blue</Badge>
      <Badge color="blue-light">Blue Light</Badge>
      <Badge color="gray-blue">Gray Blue</Badge>
      <Badge color="indigo">Indigo</Badge>
      <Badge color="purple">Purple</Badge>
      <Badge color="pink">Pink</Badge>
      <Badge color="orange">Orange</Badge>
    </div>
  ),
}

export const AllTypes: Story = {
  args: { children: "All" },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: 80, fontSize: 12, color: "#888" }}>Pill</span>
        <Badge type="pill-color" color="brand">Brand</Badge>
        <Badge type="pill-color" color="success">Success</Badge>
        <Badge type="pill-color" color="error">Error</Badge>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: 80, fontSize: 12, color: "#888" }}>Badge</span>
        <Badge type="color" color="brand">Brand</Badge>
        <Badge type="color" color="success">Success</Badge>
        <Badge type="color" color="error">Error</Badge>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: 80, fontSize: 12, color: "#888" }}>Modern</span>
        <Badge type="modern" color="gray">Gray</Badge>
      </div>
    </div>
  ),
}

export const AllAddons: Story = {
  args: { children: "All" },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: 100, fontSize: 12, color: "#888" }}>Plain</span>
        <Badge color="brand">Label</Badge>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: 100, fontSize: 12, color: "#888" }}>Dot</span>
        <BadgeWithDot color="success">Active</BadgeWithDot>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: 100, fontSize: 12, color: "#888" }}>Icon leading</span>
        <BadgeWithIcon color="brand" iconLeading={ArrowUp}>Trending</BadgeWithIcon>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: 100, fontSize: 12, color: "#888" }}>Icon trailing</span>
        <BadgeWithIcon color="brand" iconTrailing={ArrowRight}>Next</BadgeWithIcon>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: 100, fontSize: 12, color: "#888" }}>X close</span>
        <BadgeWithButton color="brand">Dismiss</BadgeWithButton>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: 100, fontSize: 12, color: "#888" }}>Icon only</span>
        <BadgeIcon color="brand" icon={Plus} />
      </div>
    </div>
  ),
}
