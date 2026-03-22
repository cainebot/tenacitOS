import type { Meta, StoryObj } from "@storybook/react"
import { Form } from "./form/form"
import { Input } from "./input/input"
import { Button } from "./button"

const meta: Meta<typeof Form> = {
  title: "Base/Form",
  component: Form,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Form>

export const Default: Story = {
  render: () => (
    <Form
      onSubmit={(e) => {
        e.preventDefault()
        console.log("Form submitted")
      }}
      className="flex flex-col gap-4"
    >
      <Input label="Email" type="email" placeholder="Enter your email" size="md" />
      <Input label="Password" type="password" placeholder="••••••••" size="md" />
      <Button type="submit" size="md">Submit</Button>
    </Form>
  ),
}
