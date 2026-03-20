import type { Meta, StoryObj } from "@storybook/react"
import { Badge } from "./badge"

const meta = {
  title: "Base/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "brand", "success", "warning", "error", "info", "gray"],
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
    variant: "default",
    children: "Default",
  },
}

export const Brand: Story = {
  args: {
    variant: "brand",
    children: "Brand",
  },
}

export const Success: Story = {
  args: {
    variant: "success",
    children: "Success",
  },
}

export const Warning: Story = {
  args: {
    variant: "warning",
    children: "Warning",
  },
}

export const Error: Story = {
  args: {
    variant: "error",
    children: "Error",
  },
}

export const Info: Story = {
  args: {
    variant: "info",
    children: "Info",
  },
}

export const AllVariants: Story = {
  args: { children: "All" },
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <Badge variant="default">Default</Badge>
      <Badge variant="brand">Brand</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="gray">Gray</Badge>
    </div>
  ),
}
