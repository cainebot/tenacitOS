import type { Meta, StoryObj } from "@storybook/react"
import * as Icons from "./index"

const meta: Meta = {
  title: "Foundations/IntegrationIcons",
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

export const Grid: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, padding: 16 }}>
      {Object.entries(Icons).map(([name, Icon]) => {
        const C = Icon as React.ComponentType<{ className?: string }>
        return (
          <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <C className="size-10" />
            <span style={{ fontSize: 11 }} className="text-tertiary">{name}</span>
          </div>
        )
      })}
    </div>
  ),
}
