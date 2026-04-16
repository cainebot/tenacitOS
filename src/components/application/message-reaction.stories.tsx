import type { Meta, StoryObj } from '@storybook/react'
import { MessageReaction } from './message-reaction'

const meta: Meta<typeof MessageReaction> = {
  title: 'Application/MessageReaction',
  component: MessageReaction,
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof MessageReaction>

const HeartEmoji = () => <span className="text-xs leading-none">❤️</span>
const ThumbsUpEmoji = () => <span className="text-xs leading-none">👍</span>
const EyesEmoji = () => <span className="text-xs leading-none">👀</span>

export const EmojiOnly: Story = {
  args: {
    emoji: <HeartEmoji />,
  },
}

export const WithCount: Story = {
  args: {
    emoji: <HeartEmoji />,
    count: 2,
  },
}

export const Selected: Story = {
  args: {
    emoji: <ThumbsUpEmoji />,
    count: 5,
    isSelected: true,
  },
}

export const Group: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <MessageReaction emoji={<HeartEmoji />} count={2} />
      <MessageReaction emoji={<ThumbsUpEmoji />} count={5} isSelected />
      <MessageReaction emoji={<EyesEmoji />} />
    </div>
  ),
}
