import type { Meta, StoryObj } from "@storybook/react"
import { Edit05, Trash01, Copy01 } from "@untitledui/icons"
import { Dropdown } from "./index"
import { Button } from "./button"

interface DropdownStoryProps {
  triggerLabel: string
  showIcons: boolean
  showAddons: boolean
  showSeparator: boolean
  placement: "bottom" | "bottom left" | "bottom right" | "top" | "top left" | "top right"
  useDotsTrigger: boolean
}

const DropdownStory = ({
  triggerLabel,
  showIcons,
  showAddons,
  showSeparator,
  placement,
  useDotsTrigger,
}: DropdownStoryProps) => (
  <Dropdown.Root>
    {useDotsTrigger ? (
      <Dropdown.DotsButton />
    ) : (
      <Button>{triggerLabel}</Button>
    )}
    <Dropdown.Popover placement={placement}>
      <Dropdown.Menu>
        <Dropdown.Item
          label="Edit"
          icon={showIcons ? Edit05 : undefined}
          addon={showAddons ? "Cmd+E" : undefined}
        />
        <Dropdown.Item
          label="Duplicate"
          icon={showIcons ? Copy01 : undefined}
          addon={showAddons ? "Cmd+D" : undefined}
        />
        {showSeparator && <Dropdown.Separator />}
        <Dropdown.Item
          label="Delete"
          icon={showIcons ? Trash01 : undefined}
          addon={showAddons ? "Cmd+⌫" : undefined}
        />
      </Dropdown.Menu>
    </Dropdown.Popover>
  </Dropdown.Root>
)

const meta: Meta<DropdownStoryProps> = {
  title: "Base/Dropdown",
  component: DropdownStory,
  tags: ["autodocs"],
  argTypes: {
    triggerLabel: { control: "text" },
    showIcons: { control: "boolean" },
    showAddons: { control: "boolean" },
    showSeparator: { control: "boolean" },
    placement: {
      control: "select",
      options: ["bottom", "bottom left", "bottom right", "top", "top left", "top right"],
    },
    useDotsTrigger: { control: "boolean" },
  },
}

export default meta
type Story = StoryObj<DropdownStoryProps>

export const Default: Story = {
  args: {
    triggerLabel: "Open menu",
    showIcons: false,
    showAddons: false,
    showSeparator: true,
    placement: "bottom right",
    useDotsTrigger: false,
  },
}

export const WithIcons: Story = {
  args: {
    triggerLabel: "Actions",
    showIcons: true,
    showAddons: false,
    showSeparator: true,
    placement: "bottom right",
    useDotsTrigger: false,
  },
}

export const WithDotsButton: Story = {
  args: {
    triggerLabel: "Open menu",
    showIcons: true,
    showAddons: false,
    showSeparator: true,
    placement: "bottom right",
    useDotsTrigger: true,
  },
}

export const WithAddons: Story = {
  args: {
    triggerLabel: "Shortcuts",
    showIcons: false,
    showAddons: true,
    showSeparator: false,
    placement: "bottom right",
    useDotsTrigger: false,
  },
}
