import type { Meta, StoryObj } from "@storybook/react"
import { Edit05, Trash01, Copy01 } from "@untitledui/icons"
import { Dropdown } from "./index"
import { Button } from "./button"

const meta: Meta = {
  title: "Base/Dropdown",
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <Dropdown.Root>
      <Button>Open menu</Button>
      <Dropdown.Popover>
        <Dropdown.Menu>
          <Dropdown.Item label="Edit" />
          <Dropdown.Item label="Duplicate" />
          <Dropdown.Separator />
          <Dropdown.Item label="Delete" />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  ),
}

export const WithIcons: Story = {
  render: () => (
    <Dropdown.Root>
      <Button>Actions</Button>
      <Dropdown.Popover>
        <Dropdown.Menu>
          <Dropdown.Item label="Edit" icon={Edit05} />
          <Dropdown.Item label="Duplicate" icon={Copy01} />
          <Dropdown.Separator />
          <Dropdown.Item label="Delete" icon={Trash01} />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  ),
}

export const WithDotsButton: Story = {
  render: () => (
    <Dropdown.Root>
      <Dropdown.DotsButton />
      <Dropdown.Popover>
        <Dropdown.Menu>
          <Dropdown.Item label="Edit" icon={Edit05} />
          <Dropdown.Item label="Duplicate" icon={Copy01} />
          <Dropdown.Separator />
          <Dropdown.Item label="Delete" icon={Trash01} />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  ),
}

export const WithAddons: Story = {
  render: () => (
    <Dropdown.Root>
      <Button>Shortcuts</Button>
      <Dropdown.Popover>
        <Dropdown.Menu>
          <Dropdown.Item label="Cut" addon="Cmd+X" />
          <Dropdown.Item label="Copy" addon="Cmd+C" />
          <Dropdown.Item label="Paste" addon="Cmd+V" />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  ),
}
