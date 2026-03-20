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
    trigger: <Button variant="primary">Open Modal</Button>,
    children: (
      <>
        <ModalHeader>Modal Title</ModalHeader>
        <ModalBody>
          <p>This is the modal body content. You can place any content here.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" slot="close">Cancel</Button>
          <Button variant="primary">Confirm</Button>
        </ModalFooter>
      </>
    ),
  },
}

export const Small: Story = {
  args: {
    size: "sm",
    trigger: <Button variant="secondary">Open Small Modal</Button>,
    children: (
      <>
        <ModalHeader>Delete Item</ModalHeader>
        <ModalBody>
          <p>Are you sure you want to delete this item? This action cannot be undone.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" slot="close">Cancel</Button>
          <Button variant="danger">Delete</Button>
        </ModalFooter>
      </>
    ),
  },
}

export const Large: Story = {
  args: {
    size: "lg",
    trigger: <Button variant="secondary">Open Large Modal</Button>,
    children: (
      <>
        <ModalHeader>Large Modal</ModalHeader>
        <ModalBody>
          <p>
            This is a large modal with more content. It uses the &quot;lg&quot; size
            variant, which gives more horizontal space for complex layouts.
          </p>
          <p style={{ marginTop: "12px" }}>
            You can use this size for forms, detailed information, or any content
            that benefits from additional width.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" slot="close">Close</Button>
        </ModalFooter>
      </>
    ),
  },
}

export const WithForm: Story = {
  args: {
    size: "md",
    trigger: <Button variant="primary">Open Form Modal</Button>,
    children: (
      <>
        <ModalHeader>Create New Item</ModalHeader>
        <ModalBody>
          <form
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            onSubmit={(e) => e.preventDefault()}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label
                htmlFor="name"
                style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Enter name"
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label
                htmlFor="description"
                style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}
              >
                Description
              </label>
              <textarea
                id="description"
                placeholder="Enter description"
                rows={3}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" slot="close">Cancel</Button>
          <Button variant="primary">Create</Button>
        </ModalFooter>
      </>
    ),
  },
}
