import type { Meta, StoryObj } from "@storybook/react"
import { TextArea } from "./textarea"

const meta: Meta<typeof TextArea> = {
  title: "Base/TextArea",
  component: TextArea,
  tags: ["autodocs"],
  argTypes: {
    hint: { control: "text" },
    tooltip: { control: "text" },
    isInvalid: { control: "boolean" },
    isDisabled: { control: "boolean" },
    isRequired: { control: "boolean" },
    isReadOnly: { control: "boolean" },
    hideRequiredIndicator: { control: "boolean" },
    maxLength: { control: "number" },
    rows: { control: "number" },
    cols: { control: "number" },
    textAreaClassName: { table: { disable: true } },
    ref: { table: { disable: true } },
    textAreaRef: { table: { disable: true } },
    className: { table: { disable: true } },
    validationBehavior: { table: { disable: true } },
    validate: { table: { disable: true } },
  },
}

export default meta
type Story = StoryObj<typeof TextArea>

export const Default: Story = {
  args: {
    label: "Message",
    placeholder: "Type your message...",
    isInvalid: false,
    isDisabled: false,
    isRequired: false,
    isReadOnly: false,
    hideRequiredIndicator: false,
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

export const Required: Story = {
  args: {
    label: "Message",
    placeholder: "Type your message...",
    isRequired: true,
  },
}

export const ReadOnly: Story = {
  args: {
    label: "Message",
    defaultValue: "This content cannot be edited",
    isReadOnly: true,
  },
}
