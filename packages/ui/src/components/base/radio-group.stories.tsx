import type { Meta, StoryObj } from "@storybook/react"
import { RadioGroup, Radio } from "./index"

const meta: Meta<typeof RadioGroup> = {
  title: "Base/RadioGroup",
  component: RadioGroup,
  subcomponents: { Radio } as never,
  tags: ["autodocs"],
  args: {
    label: "Select a plan",
  },
  argTypes: {
    label: { control: "text" },
    description: { control: "text" },
    errorMessage: { control: "text" },
    isDisabled: { control: "boolean" },
  },
  render: (args) => (
    <RadioGroup {...args}>
      <Radio value="free" label="Free" />
      <Radio value="pro" label="Pro" />
      <Radio value="enterprise" label="Enterprise" />
    </RadioGroup>
  ),
}

export default meta
type Story = StoryObj<typeof RadioGroup>

export const Default: Story = {}

export const WithLabelsAndHints: Story = {
  args: {
    label: "Select a plan",
    // @ts-expect-error -- custom args for Radio children
    hint1: "Up to 5 users, basic features",
    hint2: "Up to 50 users, advanced features",
    hint3: "Unlimited users, custom features",
  },
  argTypes: {
    // @ts-expect-error -- custom args for Radio children
    hint1: { control: "text", name: "Hint (Free)" },
    hint2: { control: "text", name: "Hint (Pro)" },
    hint3: { control: "text", name: "Hint (Enterprise)" },
  },
  render: (args) => {
    const { hint1, hint2, hint3, ...groupArgs } = args as typeof args & {
      hint1?: string
      hint2?: string
      hint3?: string
    }
    return (
      <RadioGroup {...groupArgs}>
        <Radio value="free" label="Free" hint={hint1} />
        <Radio value="pro" label="Pro" hint={hint2} />
        <Radio value="enterprise" label="Enterprise" hint={hint3} />
      </RadioGroup>
    )
  },
}

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
}
