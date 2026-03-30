import type { Meta, StoryObj } from "@storybook/react"
import { AgentSubNav, AgentSubNavDivider } from "./AgentSubNav"
import { AgentListItem } from "./AgentListItem"

const meta: Meta<typeof AgentSubNav> = {
  title: "Patterns/AgentSubNav",
  component: AgentSubNav,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof AgentSubNav>

export const Default: Story = {
  render: () => (
    <div className="h-[600px] bg-primary">
      <AgentSubNav title="Agents" count={4}>
        {/* Summary item */}
        <AgentListItem
          name="All agents"
          subtitle="7 total"
          badgeText="5 active"
          badgeColor="success"
          onClick={() => {}}
        />

        <AgentSubNavDivider />

        {/* Individual agents */}
        <AgentListItem
          name="Ragatha"
          badgeText="Inactive"
          badgeColor="error"
          avatarStatus="offline"
          onClick={() => {}}
        />
        <AgentListItem
          name="Pomni"
          subtitle="Scrum master"
          badgeText="IDLE"
          badgeColor="indigo"
          onClick={() => {}}
        />
        <AgentListItem
          name="Kinger"
          badgeText="Working"
          badgeColor="success"
          avatarStatus="online"
          onClick={() => {}}
        />
        <AgentListItem
          name="Jax"
          badgeText="Working"
          badgeColor="success"
          avatarStatus="online"
          onClick={() => {}}
        />
      </AgentSubNav>
    </div>
  ),
}

export const WithActiveItem: Story = {
  render: () => (
    <div className="h-[600px] bg-primary">
      <AgentSubNav title="Agents" count={4}>
        <AgentListItem
          name="All agents"
          subtitle="7 total"
          badgeText="5 active"
          badgeColor="success"
          active
          onClick={() => {}}
        />

        <AgentSubNavDivider />

        <AgentListItem
          name="Ragatha"
          badgeText="Inactive"
          badgeColor="error"
          avatarStatus="offline"
          onClick={() => {}}
        />
        <AgentListItem
          name="Pomni"
          subtitle="Scrum master"
          badgeText="IDLE"
          badgeColor="indigo"
          onClick={() => {}}
        />
        <AgentListItem
          name="Kinger"
          badgeText="Working"
          badgeColor="success"
          avatarStatus="online"
          active
          onClick={() => {}}
        />
        <AgentListItem
          name="Jax"
          badgeText="Working"
          badgeColor="success"
          avatarStatus="online"
          onClick={() => {}}
        />
      </AgentSubNav>
    </div>
  ),
}
