import type { Meta, StoryObj } from '@storybook/react'
import { AgentPanel, type AgentMessage, type AgentPanelAgent } from './agent-panel'

const pomni: AgentPanelAgent = {
  id: 'pomni',
  name: 'Pomni',
  role: 'Scrum master',
  avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni',
  status: 'online',
}

const sampleMessages: AgentMessage[] = [
  {
    id: '1',
    sender: 'agent',
    senderName: 'Pomni',
    senderAvatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni',
    content:
      "Hey! We're working on a dashboard prototype and love your work. Are you open to new projects?",
    timestamp: 'Thursday 10:16am',
  },
  {
    id: '2',
    sender: 'user',
    senderName: 'You',
    content:
      'Hey Pomni, I have some capacity in a few weeks. Can you tell me a little more about the project?',
    timestamp: 'Thursday 11:41am',
    status: 'read',
  },
  {
    id: '3',
    sender: 'agent',
    senderName: 'Pomni',
    senderAvatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni',
    content:
      "Great! We've drafted an outline here. Let me know if you have any questions!",
    timestamp: 'Thursday 12:14pm',
  },
  {
    id: '4',
    sender: 'agent',
    senderName: 'Pomni',
    senderAvatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni',
    content: '',
    timestamp: 'Thursday 12:14pm',
    attachment: {
      type: 'file',
      fileName: 'Dashboard Design Brief.pdf',
      fileSize: '800 KB',
      fileType: 'PDF',
    },
  },
  {
    id: '5',
    sender: 'user',
    senderName: 'You',
    content:
      "I'll have a more thorough read and get back to you by tomorrow. Is that okay?",
    timestamp: 'Thursday 12:29pm',
    status: 'read',
    reactions: [{ emoji: '❤️' }, { emoji: '👌' }],
  },
  {
    id: '6',
    sender: 'agent',
    senderName: 'Pomni',
    senderAvatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni',
    content: '',
    timestamp: 'Thursday 12:30pm',
    attachment: {
      type: 'link',
      url: 'https://www.untitledui.com',
      ogImage:
        'https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=600&h=315&fit=crop',
    },
  },
  {
    id: '7',
    sender: 'user',
    senderName: 'You',
    content:
      "Hey Pomni, I've had a read through and made some notes:\nhttps://docs.google.com/docu...",
    timestamp: '10 mins ago',
    status: 'read',
  },
  {
    id: '8',
    sender: 'agent',
    senderName: 'Pomni',
    senderAvatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni',
    content: 'Thank you for the quick turnaround. Looking now.',
    timestamp: 'Just now',
  },
]

const meta: Meta<typeof AgentPanel> = {
  title: 'Application/AgentPanel',
  component: AgentPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="h-screen w-[400px] ml-auto">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof AgentPanel>

export const Default: Story = {
  args: {
    agent: pomni,
    messages: sampleMessages,
    isTyping: false,
  },
}

export const Typing: Story = {
  args: {
    agent: pomni,
    messages: sampleMessages.slice(0, 3),
    isTyping: true,
  },
}

export const Offline: Story = {
  args: {
    agent: { ...pomni, status: 'offline' },
    messages: sampleMessages.slice(0, 2),
    isTyping: false,
  },
}

export const EmptyChat: Story = {
  args: {
    agent: pomni,
    messages: [],
    isTyping: false,
  },
}

export const WithProfileContent: Story = {
  args: {
    agent: pomni,
    messages: sampleMessages,
    profileContent: (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wide">
            Department
          </span>
          <span className="text-sm text-primary">Engineering</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wide">
            Home Desk
          </span>
          <span className="text-sm text-primary">Zone A — Desk 3</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wide">
            Current Task
          </span>
          <span className="text-sm text-primary">
            Sprint planning for Q2 dashboard redesign
          </span>
        </div>
      </div>
    ),
  },
}
