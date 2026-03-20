import type { Meta, StoryObj } from "@storybook/react"
import { ModalForm } from "./ModalForm"
import { Button } from "../base/button"
import { Input } from "../base/input"
import { TextArea } from "../base/textarea"
import { Select, SelectItem } from "../base/select"

const meta: Meta<typeof ModalForm> = {
  title: "Patterns/ModalForm",
  component: ModalForm,
  tags: ["autodocs"],
}

export default meta

type Story = StoryObj<typeof ModalForm>

export const Create: Story = {
  args: {
    title: "Create Cron Job",
    description: "Schedule a new recurring task.",
    trigger: <Button>New Cron Job</Button>,
    submitLabel: "Create",
    children: (
      <div className="flex flex-col gap-4">
        <Input label="Name" placeholder="Job name" />
        <Input label="Schedule" placeholder="*/5 * * * *" />
        <Select label="Agent">
          <SelectItem id="agent-1">Agent Alpha</SelectItem>
          <SelectItem id="agent-2">Agent Beta</SelectItem>
        </Select>
        <TextArea label="Description" placeholder="What does this job do?" />
      </div>
    ),
  },
}

export const Delete: Story = {
  args: {
    title: "Delete Board",
    description: "This action cannot be undone. All cards in this board will be permanently removed.",
    trigger: <Button variant="danger">Delete</Button>,
    submitLabel: "Delete Board",
    submitVariant: "danger",
    children: (
      <Input label="Type board name to confirm" placeholder="my-board" />
    ),
  },
}
