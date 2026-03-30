import type { Meta, StoryObj } from "@storybook/react"
import { TextEditor } from "./text-editor"

const meta: Meta<typeof TextEditor> = {
  title: "Application/TextEditor",
  component: TextEditor,
  tags: ["autodocs"],
  argTypes: {
    content: { control: "text" },
    placeholder: { control: "text" },
    hintText: { control: "text" },
    maxCharacters: { control: "number" },
    showHintText: { control: "boolean" },
    isDisabled: { control: "boolean" },
    onContentChange: { table: { disable: true } },
    className: { table: { disable: true } },
  },
}

export default meta

type Story = StoryObj<typeof TextEditor>

export const Default: Story = {}

export const WithContent: Story = {
  args: {
    content: `<h2>Project Update</h2><p>Here is a summary of what we accomplished this sprint:</p><ul><li>Completed the authentication flow</li><li>Designed new landing page mockups</li><li>Fixed critical bugs in the dashboard</li></ul><p>Next steps include <strong>performance optimization</strong> and <em>user testing</em>.</p>`,
  },
}

export const WithCharacterCount: Story = {
  args: {
    maxCharacters: 500,
    hintText: "{chars} characters left",
    showHintText: true,
  },
}

export const Disabled: Story = {
  args: {
    content: "<p>This editor is read-only.</p>",
    isDisabled: true,
  },
}
