import type { Meta, StoryObj } from "@storybook/react"
import { FileTrigger } from "./file-upload-trigger"
import { Button } from "../button"

const meta: Meta<typeof FileTrigger> = {
  title: "Base/FileTrigger",
  component: FileTrigger,
  tags: ["autodocs"],
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/design/MBkN7H8nYLx7DNhzTf8vcD/",
    },
  },
}

export default meta
type Story = StoryObj<typeof FileTrigger>

export const Default: Story = {
  render: () => (
    <FileTrigger>
      <Button color="primary">Upload file</Button>
    </FileTrigger>
  ),
}
