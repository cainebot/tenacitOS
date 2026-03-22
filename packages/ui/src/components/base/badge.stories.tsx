import type { Meta, StoryObj } from "@storybook/react"
import { Badge } from "./badge"

const meta = {
  title: "Base/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    color: {
      control: "select",
      options: [
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
      ],
    },
    type: {
      control: "select",
      options: ["pill-color", "color", "modern"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
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
