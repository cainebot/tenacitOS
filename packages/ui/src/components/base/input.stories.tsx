import type { Meta, StoryObj } from "@storybook/react"
import { Mail01, User01, HelpCircle, InfoCircle, SearchLg, Check, ChevronDown } from "@untitledui/icons"
import { Input } from "./input/input"

const iconMap: Record<string, typeof Mail01 | undefined> = {
  None: undefined,
  Mail01,
  User01,
  SearchLg,
  HelpCircle,
  InfoCircle,
  Check,
  ChevronDown,
}

const meta: Meta<typeof Input> = {
  title: "Base/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    hint: { control: "text" },
    icon: {
      control: "select",
      options: Object.keys(iconMap),
      mapping: iconMap,
    },
    ref: { control: false },
    shortcut: { control: false },
    groupRef: { control: false },
  },
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
