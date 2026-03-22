import type { Meta, StoryObj } from "@storybook/react"
import { TextArea } from "./textarea"

const meta: Meta<typeof TextArea> = {
  title: "Base/TextArea",
  component: TextArea,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof TextArea>

export const Default: Story = {
  args: {
    label: "Message",
    placeholder: "Type your message...",
  },
}

export const WithHint: Story = {
  args: {
    label: "Message",
    placeholder: "Type your message...",
    hint: "Max 500 characters",
  },
}

export const Invalid: Story = {
  args: {
    label: "Message",
    placeholder: "Type your message...",
    isInvalid: true,
    hint: "This field is required",
  },
}

export const Disabled: Story = {
  args: {
    label: "Message",
    placeholder: "Type your message...",
    isDisabled: true,
  },
}
