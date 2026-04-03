import type { Meta, StoryObj } from '@storybook/react'
import { MessageActionPanel, type MessageAction } from './message-action-panel'

const meta: Meta<typeof MessageActionPanel> = {
  title: 'Application/MessageActionPanel',
  component: MessageActionPanel,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="flex items-center justify-center p-12 bg-primary">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof MessageActionPanel>

export const Default: Story = {}

export const AiAndCopyOnly: Story = {
  args: {
    actions: ['ai', 'copy'] as MessageAction[],
  },
}

export const SingleAction: Story = {
  args: {
    actions: ['copy'] as MessageAction[],
  },
}

export const OnMessageBubble: Story = {
  decorators: [
    (Story) => (
      <div className="flex items-center justify-center p-12 bg-primary">
        <div className="relative bg-primary border border-secondary rounded-bl-lg rounded-br-lg rounded-tr-lg px-3 py-2 max-w-xs">
          <p className="text-md text-primary">
            I've finished the analysis of the lead list. Found 3 high-priority prospects.
          </p>
          <div className="absolute -bottom-5 right-2 z-10">
            <Story />
          </div>
        </div>
      </div>
    ),
  ],
}
