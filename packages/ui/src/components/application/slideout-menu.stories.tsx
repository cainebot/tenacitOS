import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { SlideoutMenu } from "./slideout-menu"
import { Button } from "../base/button"

const meta: Meta<typeof SlideoutMenu> = {
  title: "Application/SlideoutMenu",
  component: SlideoutMenu,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
}

export default meta

type Story = StoryObj<typeof SlideoutMenu>

export const Default: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Panel</Button>
        <SlideoutMenu
          {...args}
          title="Panel Title"
          isOpen={isOpen}
          onOpenChange={setIsOpen}
        >
          <p className="text-secondary">
            This is the slideout panel content. It slides in from the right side
            of the screen.
          </p>
        </SlideoutMenu>
      </>
    )
  },
}

export const WithoutTitle: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Panel</Button>
        <SlideoutMenu isOpen={isOpen} onOpenChange={setIsOpen}>
          <h3 className="mb-4 text-lg font-semibold text-primary">
            Custom Header
          </h3>
          <p className="text-secondary">
            This panel has no built-in title, allowing custom header content.
          </p>
        </SlideoutMenu>
      </>
    )
  },
}

export const LargeSize: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Large Panel</Button>
        <SlideoutMenu
          title="Large Panel"
          size="lg"
          isOpen={isOpen}
          onOpenChange={setIsOpen}
        >
          <p className="text-secondary">
            This panel uses size=&quot;lg&quot; for wider content.
          </p>
        </SlideoutMenu>
      </>
    )
  },
}
