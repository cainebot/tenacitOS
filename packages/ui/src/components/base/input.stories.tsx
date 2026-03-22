import type { Meta, StoryObj } from "@storybook/react"
import { Mail01 } from "@untitledui/icons"
import { Input } from "./input/input"

const meta: Meta<typeof Input> = {
  title: "Base/Input",
  component: Input,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: {
    label: "Email",
    placeholder: "olivia@example.com",
  },
}

export const WithIcon: Story = {
  args: {
    label: "Email",
    placeholder: "olivia@example.com",
    icon: Mail01,
  },
}

export const Invalid: Story = {
  args: {
    label: "Email",
    placeholder: "olivia@example.com",
    isInvalid: true,
    hint: "Please enter a valid email",
  },
}

export const Disabled: Story = {
  args: {
    label: "Email",
    placeholder: "olivia@example.com",
    isDisabled: true,
  },
}

export const Required: Story = {
  args: {
    label: "Email",
    placeholder: "olivia@example.com",
    isRequired: true,
  },
}
