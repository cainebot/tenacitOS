import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "./button"

const meta = {
  title: "Base/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "danger", "link"],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl", "2xl"],
    },
    isLoading: { control: "boolean" },
    isDisabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Primary Button",
  },
}

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary Button",
  },
}

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline Button",
  },
}

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Ghost Button",
  },
}

export const Danger: Story = {
  args: {
    variant: "danger",
    children: "Danger Button",
  },
}

export const Link: Story = {
  args: {
    variant: "link",
    children: "Link Button",
  },
}

export const Loading: Story = {
  args: {
    variant: "primary",
    isLoading: true,
    children: "Loading...",
  },
}

export const WithIcons: Story = {
  args: {
    variant: "primary",
    iconLeading: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </svg>
    ),
    iconTrailing: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    ),
    children: "With Icons",
  },
}

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
      <Button size="2xl">2X Large</Button>
    </div>
  ),
}
