import type { Meta, StoryObj } from "@storybook/react"
import { FileTypeIcon } from "./file-type-icon"

const meta: Meta<typeof FileTypeIcon> = {
  title: "Foundations/FileTypeIcon",
  component: FileTypeIcon,
  tags: ["autodocs"],
  argTypes: {
    fileType: {
      control: "text",
      description: "File extension label displayed on the icon",
    },
    color: {
      control: "select",
      options: [
        "bg-error-600",
        "bg-brand-600",
        "bg-success-600",
        "bg-warning-600",
        "bg-blue-600",
        "bg-purple-600",
        "bg-orange-600",
      ],
      description: "Tailwind background color class for the file type label",
    },
    size: {
      control: "radio",
      options: ["sm", "md"],
      description: "Icon size — sm (32px) or md (40px)",
    },
  },
}

export default meta
type Story = StoryObj<typeof FileTypeIcon>

export const Default: Story = {
  args: {
    fileType: "PDF",
    color: "bg-error-600",
    size: "md",
  },
}

export const Small: Story = {
  args: {
    fileType: "PDF",
    color: "bg-error-600",
    size: "sm",
  },
}

export const FileTypes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <div className="flex flex-col items-center gap-2">
        <FileTypeIcon fileType="PDF" color="bg-error-600" />
        <span className="text-xs text-tertiary">PDF</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <FileTypeIcon fileType="DOC" color="bg-brand-600" />
        <span className="text-xs text-tertiary">DOC</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <FileTypeIcon fileType="XLS" color="bg-success-600" />
        <span className="text-xs text-tertiary">XLS</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <FileTypeIcon fileType="PNG" color="bg-purple-600" />
        <span className="text-xs text-tertiary">PNG</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <FileTypeIcon fileType="ZIP" color="bg-warning-600" />
        <span className="text-xs text-tertiary">ZIP</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <FileTypeIcon fileType="MP4" color="bg-orange-600" />
        <span className="text-xs text-tertiary">MP4</span>
      </div>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <div className="flex flex-col items-center gap-2">
        <FileTypeIcon fileType="PDF" color="bg-error-600" size="sm" />
        <span className="text-xs text-tertiary">sm</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <FileTypeIcon fileType="PDF" color="bg-error-600" size="md" />
        <span className="text-xs text-tertiary">md</span>
      </div>
    </div>
  ),
}
