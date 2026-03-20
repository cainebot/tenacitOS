import type { Meta, StoryObj } from "@storybook/react"
import { DetailPanel, DetailPanelItem } from "./DetailPanel"
import { Badge } from "../base/badge"

const meta: Meta<typeof DetailPanel> = {
  title: "Patterns/DetailPanel",
  component: DetailPanel,
  tags: ["autodocs"],
}

export default meta

type Story = StoryObj<typeof DetailPanel>

export const Default: Story = {
  args: {
    list: (
      <div>
        <DetailPanelItem title="Build Frontend" subtitle="Due in 2 days" isSelected />
        <DetailPanelItem title="API Integration" subtitle="In progress" trailing={<Badge variant="warning" size="sm">WIP</Badge>} />
        <DetailPanelItem title="Deploy to Prod" subtitle="Blocked" trailing={<Badge variant="error" size="sm">Blocked</Badge>} />
      </div>
    ),
    detail: (
      <div className="p-6">
        <h2 className="text-lg font-semibold text-primary">Build Frontend</h2>
        <p className="mt-2 text-sm text-secondary">
          Complete the frontend migration to UUI components.
        </p>
      </div>
    ),
  },
  decorators: [(Story) => <div className="h-[400px]"><Story /></div>],
}
