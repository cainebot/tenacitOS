import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Check,
  Download01,
  Upload01,
  Trash01,
  Edit05,
  SearchMd,
  Settings01,
  Mail01,
  Star01,
  Heart,
  Home01,
  ArrowRight,
  ArrowLeft,
} from "@untitledui/icons"
import { Button } from "./buttons/button"

const iconMap: Record<string, React.FC<{ className?: string }> | undefined> = {
  None: undefined,
  Plus,
  ChevronRight,
  ChevronDown,
  Check,
  Download01,
  Upload01,
  Trash01,
  Edit05,
  SearchMd,
  Settings01,
  Mail01,
  Star01,
  Heart,
  Home01,
  ArrowRight,
  ArrowLeft,
}

const iconOptions = Object.keys(iconMap)

const meta = {
  title: "Base/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    color: {
      control: "select",
      options: [
        "primary",
        "secondary",
        "tertiary",
        "link-gray",
        "link-color",
        "primary-destructive",
        "secondary-destructive",
        "tertiary-destructive",
        "link-destructive",
      ],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl"],
    },
    isLoading: { control: "boolean" },
    isDisabled: { control: "boolean" },
    showTextWhileLoading: { control: "boolean" },
    noTextPadding: { control: "boolean" },
    iconLeading: {
      control: "select",
      options: iconOptions,
      mapping: iconMap,
    },
    iconTrailing: {
      control: "select",
      options: iconOptions,
      mapping: iconMap,
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    color: "primary",
    children: "Primary Button",
  },
}

export const Secondary: Story = {
  args: {
    color: "secondary",
    children: "Secondary Button",
  },
}

export const Tertiary: Story = {
  args: {
    color: "tertiary",
    children: "Tertiary Button",
  },
}

export const LinkGray: Story = {
  args: {
    color: "link-gray",
    children: "Link Gray",
  },
}

export const LinkColor: Story = {
  args: {
    color: "link-color",
    children: "Link Color",
  },
}

export const Danger: Story = {
  args: {
    color: "primary-destructive",
    children: "Delete",
    iconLeading: Trash01,
  },
}

export const Loading: Story = {
  args: {
    color: "primary",
    isLoading: true,
    children: "Saving...",
  },
}

export const LoadingWithText: Story = {
  args: {
    color: "primary",
    isLoading: true,
    showTextWhileLoading: true,
    children: "Saving...",
  },
}

export const WithIcons: Story = {
  args: {
    color: "primary",
    iconLeading: Plus,
    iconTrailing: ChevronRight,
    children: "With Icons",
  },
}

export const IconOnly: Story = {
  args: {
    color: "secondary",
    iconLeading: Plus,
  },
}

export const AsLink: Story = {
  args: {
    color: "primary",
    href: "#",
    children: "Link Button",
    iconTrailing: ArrowRight,
  },
}

export const AllSizes: Story = {
  args: {
    color: "primary",
  },
  render: (args) => (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
      <Button {...args} size="sm">Small</Button>
      <Button {...args} size="md">Medium</Button>
      <Button {...args} size="lg">Large</Button>
      <Button {...args} size="xl">Extra Large</Button>
    </div>
  ),
}

export const AllColors: Story = {
  args: {
    size: "md",
  },
  render: (args) => (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
      <Button {...args} color="primary">Primary</Button>
      <Button {...args} color="secondary">Secondary</Button>
      <Button {...args} color="tertiary">Tertiary</Button>
      <Button {...args} color="link-gray">Link Gray</Button>
      <Button {...args} color="link-color">Link Color</Button>
      <Button {...args} color="primary-destructive">Destructive</Button>
      <Button {...args} color="secondary-destructive">Sec. Destructive</Button>
      <Button {...args} color="tertiary-destructive">Ter. Destructive</Button>
      <Button {...args} color="link-destructive">Link Destructive</Button>
    </div>
  ),
}
