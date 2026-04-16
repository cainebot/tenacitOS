import type { Meta, StoryObj } from '@storybook/react'
import { MessageStatusIcon } from './message-status-icon'

const meta: Meta<typeof MessageStatusIcon> = {
  title: 'Application/MessageStatusIcon',
  component: MessageStatusIcon,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'inline-radio',
      options: ['sent', 'delivered', 'read', 'failed'],
    },
    readAt: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div className="flex items-center justify-center p-16 bg-primary">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof MessageStatusIcon>

export const Sent: Story = {
  args: { status: 'sent' },
}

export const Delivered: Story = {
  args: { status: 'delivered' },
}

export const Read: Story = {
  args: { status: 'read', readAt: '2:20 PM' },
}

export const Failed: Story = {
  args: { status: 'failed' },
}

export const AllStatuses: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <MessageStatusIcon status="sent" />
        <span className="text-xs text-tertiary">Sent</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <MessageStatusIcon status="delivered" />
        <span className="text-xs text-tertiary">Delivered</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <MessageStatusIcon status="read" readAt="2:20 PM" />
        <span className="text-xs text-tertiary">Read</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <MessageStatusIcon status="failed" />
        <span className="text-xs text-tertiary">Failed</span>
      </div>
    </div>
  ),
}
