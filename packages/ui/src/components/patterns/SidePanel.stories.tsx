import type { Meta, StoryObj } from "@storybook/react"
import { SidePanel, SidePanelForm } from "./SidePanel"
import { Button } from "../base/button"
import { Input } from "../base/input"
import { Select, SelectItem } from "../base/select"

const meta: Meta<typeof SidePanel> = {
  title: "Patterns/SidePanel",
  component: SidePanel,
  tags: ["autodocs"],
}

export default meta

type Story = StoryObj<typeof SidePanel>

export const Default: Story = {
  args: {
    title: "Agent Settings",
    trigger: <Button>Open Panel</Button>,
    children: (
      <div className="flex flex-col gap-4">
        <Input label="Name" placeholder="Enter agent name" />
        <Select label="Type">
          <SelectItem id="chat">Chat</SelectItem>
          <SelectItem id="task">Task</SelectItem>
          <SelectItem id="cron">Cron</SelectItem>
        </Select>
        <Input label="Endpoint" placeholder="https://..." />
      </div>
    ),
  },
}

export const WithForm: StoryObj<typeof SidePanelForm> = {
  render: () => (
    <SidePanelForm
      title="Edit Card"
      trigger={<Button>Edit</Button>}
      submitLabel="Update"
      onSubmit={() => alert("Submitted")}
    >
      <div className="flex flex-col gap-4">
        <Input label="Title" placeholder="Card title" />
        <Input label="Description" placeholder="Card description" />
      </div>
    </SidePanelForm>
  ),
}
