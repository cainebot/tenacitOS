import type { Meta, StoryObj } from "@storybook/react"
import { Tooltip } from "./index"
import { Button } from "./button"

const meta: Meta<typeof Tooltip> = {
  title: "Base/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Tooltip>

export const Default: Story = {
  render: () => (
    <Tooltip title="Tooltip text">
      <Button>Hover me</Button>
    </Tooltip>
  ),
}

export const WithDescription: Story = {
  render: () => (
    <Tooltip title="Tooltip title" description="This is a longer description that provides more context.">
      <Button>Hover me</Button>
    </Tooltip>
  ),
}

export const WithArrow: Story = {
  render: () => (
    <Tooltip title="With arrow" arrow>
      <Button>Hover me</Button>
    </Tooltip>
  ),
}

export const Placements: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, padding: 64, justifyContent: "center" }}>
      <Tooltip title="Top" placement="top">
        <Button>Top</Button>
      </Tooltip>
      <Tooltip title="Bottom" placement="bottom">
        <Button>Bottom</Button>
      </Tooltip>
      <Tooltip title="Left" placement="left">
        <Button>Left</Button>
      </Tooltip>
      <Tooltip title="Right" placement="right">
        <Button>Right</Button>
      </Tooltip>
    </div>
  ),
}
