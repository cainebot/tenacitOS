import type { Meta, StoryObj } from '@storybook/react'
import { ChatMessageBubble } from './chat-message-bubble'
import type { LLMMessage } from '@/types/agents'

const meta: Meta<typeof ChatMessageBubble> = {
  title: 'Application/ChatMessageBubble',
  component: ChatMessageBubble,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-[400px] flex flex-col gap-4 p-4">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    isLastAssistant: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof ChatMessageBubble>

const baseAssistantMessage: LLMMessage = {
  id: '1',
  role: 'assistant',
  content: 'Hey! I can help you set up the new agent. What role should they have?',
  createdAt: new Date().toISOString(),
}

const baseUserMessage: LLMMessage = {
  id: '2',
  role: 'user',
  content: 'I need a copywriter agent focused on LinkedIn outreach.',
  createdAt: new Date().toISOString(),
}

export const AssistantMessage: Story = {
  args: {
    message: baseAssistantMessage,
    isLastAssistant: true,
    onUpdateData: () => {},
  },
}

export const UserMessage: Story = {
  args: {
    message: baseUserMessage,
    isLastAssistant: false,
    onUpdateData: () => {},
  },
}

export const WithRadioComponent: Story = {
  args: {
    message: {
      ...baseAssistantMessage,
      id: '3',
      content: 'What communication style should the agent use?',
      data: {
        inlineComponents: [
          {
            type: 'radio',
            key: 'style',
            label: 'Communication Style',
            options: ['Professional', 'Casual', 'Technical', 'Friendly'],
          },
        ],
      },
    },
    isLastAssistant: true,
    onUpdateData: () => {},
  },
}

export const WithDropdownComponent: Story = {
  args: {
    message: {
      ...baseAssistantMessage,
      id: '4',
      content: 'Select the department for this agent:',
      data: {
        inlineComponents: [
          {
            type: 'dropdown',
            key: 'department',
            label: 'Department',
            options: ['Sales', 'Marketing', 'Engineering', 'Support'],
          },
        ],
      },
    },
    isLastAssistant: true,
    onUpdateData: () => {},
  },
}

export const WithToggleComponent: Story = {
  args: {
    message: {
      ...baseAssistantMessage,
      id: '5',
      content: 'Should the agent have autonomous outreach capabilities?',
      data: {
        inlineComponents: [
          {
            type: 'toggle',
            key: 'autonomous',
            label: 'Enable autonomous outreach',
          },
        ],
      },
    },
    isLastAssistant: true,
    onUpdateData: () => {},
  },
}

export const LockedComponents: Story = {
  name: 'Locked (not last assistant)',
  args: {
    message: {
      ...baseAssistantMessage,
      id: '6',
      content: 'What style do you prefer?',
      data: {
        style: 'Professional',
        inlineComponents: [
          {
            type: 'radio',
            key: 'style',
            label: 'Communication Style',
            options: ['Professional', 'Casual', 'Technical'],
          },
        ],
      },
    },
    isLastAssistant: false,
    onUpdateData: () => {},
  },
}

export const LongMessage: Story = {
  args: {
    message: {
      ...baseAssistantMessage,
      id: '7',
      content:
        "I've analyzed your requirements and here's what I recommend:\n\n1. Create a Copywriter agent with LinkedIn specialization\n2. Set the tone to Professional with a hint of personality\n3. Enable the prospecting workflow so the agent can identify potential leads\n4. Configure the approval gate so no messages go out without your review\n\nShall I proceed with this configuration?",
    },
    isLastAssistant: true,
    onUpdateData: () => {},
  },
}

export const SystemMessage: Story = {
  name: 'System (not rendered)',
  args: {
    message: {
      id: '8',
      role: 'system',
      content: 'You are a helpful assistant.',
      createdAt: new Date().toISOString(),
    },
    isLastAssistant: false,
    onUpdateData: () => {},
  },
}
