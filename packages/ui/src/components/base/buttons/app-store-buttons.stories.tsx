import type { Meta, StoryObj } from "@storybook/react"
import * as Filled from "./app-store-buttons"
import * as Outline from "./app-store-buttons-outline"

const meta: Meta = {
  title: "Base/AppStoreButtons",
  tags: ["autodocs"],
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/design/MBkN7H8nYLx7DNhzTf8vcD/",
    },
  },
}

export default meta
type Story = StoryObj

export const Filled_: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      <Filled.GooglePlayButton href="#" />
      <Filled.AppStoreButton href="#" />
      <Filled.GalaxyStoreButton href="#" />
      <Filled.AppGalleryButton href="#" />
    </div>
  ),
}

export const Outline_: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      <Outline.GooglePlayButton href="#" />
      <Outline.AppStoreButton href="#" />
      <Outline.GalaxyStoreButton href="#" />
      <Outline.AppGalleryButton href="#" />
    </div>
  ),
}
