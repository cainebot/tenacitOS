import type { Meta, StoryObj } from "@storybook/react"
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./modal"
import { Button } from "../base/button"

const meta = {
  title: "Application/Modal",
  component: Modal,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl"],
    },
    isDismissable: { control: "boolean" },
  },
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    size: "md",
    trigger: <Button color="primary">Open Modal</Button>,
    children: (
      <>
        <ModalHeader>Modal Title</ModalHeader>
        <ModalBody>
          <p>This is the modal body content. You can place any content here.</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary">Cancel</Button>
          <Button color="primary">Confirm</Button>
        </ModalFooter>
      </>
    ),
  },
}

export const Small: Story = {
  args: {
    size: "sm",
    trigger: <Button color="secondary">Open Small Modal</Button>,
    children: (
      <>
        <ModalHeader>Delete Item</ModalHeader>
        <ModalBody>
          <p>Are you sure you want to delete this item? This action cannot be undone.</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary">Cancel</Button>
          <Button color="primary-destructive">Delete</Button>
        </ModalFooter>
      </>
    ),
  },
}

export const Large: Story = {
  args: {
    size: "lg",
    trigger: <Button color="secondary">Open Large Modal</Button>,
    children: (
      <>
        <ModalHeader>Large Modal</ModalHeader>
        <ModalBody>
          <p>
            This is a large modal with more content. It uses the &quot;lg&quot; size
            variant, which gives more horizontal space for complex layouts.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary">Close</Button>
        </ModalFooter>
      </>
    ),
  },
}
