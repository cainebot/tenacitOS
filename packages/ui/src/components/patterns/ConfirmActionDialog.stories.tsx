import type { Meta, StoryObj } from "@storybook/react"
import { ConfirmActionDialog } from "./ConfirmActionDialog"
import { useState } from "react"
import { Button } from "../base/button"

const meta = {
  title: "Patterns/ConfirmActionDialog",
  component: ConfirmActionDialog,
  tags: ["autodocs"],
} satisfies Meta<typeof ConfirmActionDialog>

export default meta
type Story = StoryObj<typeof meta>

const defaultArgs = {
  open: false,
  onOpenChange: () => {},
  title: "Delete Agent",
  description: "Are you sure?",
  onConfirm: () => {},
  isConfirming: false,
}

export const Default: Story = {
  args: defaultArgs,
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button variant="danger" onPress={() => setOpen(true)}>Delete Agent</Button>
        <ConfirmActionDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete Agent"
          description="Are you sure you want to delete this agent? This action cannot be undone."
          onConfirm={() => setOpen(false)}
          isConfirming={false}
        />
      </>
    )
  },
}

export const WithNameConfirmation: Story = {
  args: defaultArgs,
  render: () => {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState("")
    return (
      <>
        <Button variant="danger" onPress={() => { setOpen(true); setName("") }}>Delete Node</Button>
        <ConfirmActionDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete Node"
          description="This will permanently remove the node and all its data."
          onConfirm={() => setOpen(false)}
          isConfirming={false}
          confirmName="node-1"
          confirmNameValue={name}
          onConfirmNameChange={setName}
          confirmNamePlaceholder="Type node-1 to confirm"
        />
      </>
    )
  },
}

export const WithError: Story = {
  args: defaultArgs,
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button variant="danger" onPress={() => setOpen(true)}>Try Delete</Button>
        <ConfirmActionDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete Task"
          description="Remove this task permanently?"
          onConfirm={() => {}}
          isConfirming={false}
          errorMessage="Failed to delete: task is currently running."
        />
      </>
    )
  },
}
