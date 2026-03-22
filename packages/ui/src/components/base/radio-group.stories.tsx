import type { Meta, StoryObj } from "@storybook/react"
import { RadioGroup, RadioButton } from "./index"

const meta: Meta<typeof RadioGroup> = {
  title: "Base/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof RadioGroup>

export const Default: Story = {
  render: () => (
    <RadioGroup label="Select a plan">
      <RadioButton value="free" label="Free" />
      <RadioButton value="pro" label="Pro" />
      <RadioButton value="enterprise" label="Enterprise" />
    </RadioGroup>
  ),
}

export const WithLabelsAndHints: Story = {
  render: () => (
    <RadioGroup label="Select a plan">
      <RadioButton value="free" label="Free" hint="Up to 5 users, basic features" />
      <RadioButton value="pro" label="Pro" hint="Up to 50 users, advanced features" />
      <RadioButton value="enterprise" label="Enterprise" hint="Unlimited users, custom features" />
    </RadioGroup>
  ),
}

export const Disabled: Story = {
  render: () => (
    <RadioGroup label="Select a plan" isDisabled>
      <RadioButton value="free" label="Free" />
      <RadioButton value="pro" label="Pro" />
      <RadioButton value="enterprise" label="Enterprise" />
    </RadioGroup>
  ),
}
