import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { ProjectHeader } from "./project-header"
import type { ProjectCoverValue } from "../project-cover/project-cover"

const sampleAvatars = [
  { src: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces", alt: "Olivia Rhye" },
  { src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces", alt: "Phoenix Baker" },
  { src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces", alt: "Lana Steiner" },
  { src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&crop=faces", alt: "Demi Wilkinson" },
  { src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=128&h=128&fit=crop&crop=faces", alt: "Drew Cano" },
  { src: "https://images.unsplash.com/photo-1599566150163-29194dcabd9c?w=128&h=128&fit=crop&crop=faces", alt: "Natali Craig" },
  { src: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=128&h=128&fit=crop&crop=faces", alt: "Candice Wu" },
  { src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&h=128&fit=crop&crop=faces", alt: "Orlando Diggs" },
]

const meta: Meta<typeof ProjectHeader> = {
  title: "Application/ProjectHeader",
  component: ProjectHeader,
  tags: ["autodocs"],
}

export default meta

type Story = StoryObj<typeof ProjectHeader>

function ProjectHeaderControlled() {
  const [cover, setCover] = useState<ProjectCoverValue>({
    color: "orange",
    icon: "rocket",
  })
  const [selectedTab, setSelectedTab] = useState("board")

  return (
    <ProjectHeader
      name="Sales pipeline"
      cover={cover}
      onCoverChange={setCover}
      avatars={sampleAvatars}
      onAddMember={() => {}}
      selectedTab={selectedTab}
      onTabChange={setSelectedTab}
    />
  )
}

export const Default: Story = {
  render: () => <ProjectHeaderControlled />,
}
