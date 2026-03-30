import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { ProjectCover, type ProjectCoverValue } from "./project-cover"

const meta: Meta<typeof ProjectCover> = {
  title: "Application/ProjectCover",
  component: ProjectCover,
  tags: ["autodocs"],
}

export default meta

type Story = StoryObj<typeof ProjectCover>

function ProjectCoverControlled({
  size,
}: {
  size?: "sm" | "md" | "lg"
}) {
  const [value, setValue] = useState<ProjectCoverValue>({
    color: "purple",
    icon: "rocket",
  })

  return (
    <div className="flex items-center gap-4">
      <ProjectCover value={value} onChange={setValue} size={size} />
      <div className="text-sm text-secondary">
        <p>Color: {value.color}</p>
        <p>Icon: {value.icon}</p>
      </div>
    </div>
  )
}

export const Default: Story = {
  render: () => <ProjectCoverControlled />,
}

export const Small: Story = {
  render: () => <ProjectCoverControlled size="sm" />,
}

export const Large: Story = {
  render: () => <ProjectCoverControlled size="lg" />,
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <ProjectCoverControlled size="sm" />
      <ProjectCoverControlled size="md" />
      <ProjectCoverControlled size="lg" />
    </div>
  ),
}
