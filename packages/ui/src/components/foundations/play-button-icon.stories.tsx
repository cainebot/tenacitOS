import type { Meta, StoryObj } from "@storybook/react"
import { PlayButtonIcon } from "./play-button-icon"

const meta: Meta<typeof PlayButtonIcon> = {
  title: "Foundations/PlayButtonIcon",
  component: PlayButtonIcon,
  tags: ["autodocs"],
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/design/MBkN7H8nYLx7DNhzTf8vcD/",
    },
  },
}

export default meta
type Story = StoryObj<typeof PlayButtonIcon>

export const Play: Story = { args: { isPlaying: false } }
export const Pause: Story = { args: { isPlaying: true } }
