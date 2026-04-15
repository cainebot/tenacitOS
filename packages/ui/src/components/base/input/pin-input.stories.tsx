import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { PinInput } from "./pin-input"

const meta: Meta<typeof PinInput> = {
  title: "Base/PinInput",
  component: PinInput,
  tags: ["autodocs"],
  args: {
    length: 4,
    size: "md",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["xxxs", "xxs", "xs", "sm", "md", "lg"] },
    length: { control: "number" },
    label: { control: "text" },
    hint: { control: "text" },
  },
}

export default meta
type Story = StoryObj<typeof PinInput>

const Controlled = (args: React.ComponentProps<typeof PinInput>) => {
  const [value, setValue] = useState("")
  return <PinInput {...args} value={value} onChange={setValue} />
}

export const FourDigits: Story = {
  args: { length: 4, label: "Verification code" },
  render: (args) => <Controlled {...args} />,
}

export const SixDigits: Story = {
  args: { length: 6, label: "2FA code", hint: "Enter the 6-digit code from your authenticator app" },
  render: (args) => <Controlled {...args} />,
}

export const Disabled: Story = {
  args: { length: 4, label: "Disabled", disabled: true },
}
