import type { Meta, StoryObj } from "@storybook/react"
import * as Icons from "./index"

const meta: Meta = {
  title: "Foundations/PaymentIcons",
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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 12, padding: 16 }}>
      {Object.entries(Icons).map(([name, Icon]) => {
        const C = Icon as React.ComponentType<{ className?: string }>
        return (
          <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <C className="h-8" />
            <span style={{ fontSize: 10 }} className="text-tertiary">{name.replace(/Icon$/, "")}</span>
          </div>
        )
      })}
    </div>
  ),
}
