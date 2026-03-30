import type { Meta, StoryObj } from "@storybook/react"
import { FileUpload } from "./file-upload"

const meta: Meta<typeof FileUpload> = {
  title: "Application/FileUpload",
  component: FileUpload,
  tags: ["autodocs"],
  argTypes: {
    accept: { control: "text" },
    multiple: { control: "boolean" },
    formatHint: { control: "text" },
    uploadLabel: { control: "text" },
    dragLabel: { control: "text" },
    isDisabled: { control: "boolean" },
    onFilesSelected: { table: { disable: true } },
    className: { table: { disable: true } },
  },
}

export default meta

type Story = StoryObj<typeof FileUpload>

export const Default: Story = {}

export const CustomFormat: Story = {
  args: {
    accept: "image/*",
    formatHint: "PNG, JPG or GIF only",
  },
}

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
}
