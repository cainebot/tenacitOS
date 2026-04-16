import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ChatPanel, ChatPanelSection, ChatPanelDivider } from './chat-panel'
import { Message } from './message'
import type { MessageAction } from './message-action-panel'

const meta: Meta<typeof ChatPanel> = {
  title: 'Application/ChatPanel',
  component: ChatPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="h-screen flex justify-end">
        <div className="w-[440px]">
          <Story />
        </div>
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ChatPanel>

// ── Shared data ─────────────────────────────────────────────────────────────

const defaultTabs = [
  { id: 'recent', label: 'Recent' },
  { id: 'groups', label: 'Groups' },
  { id: 'archive', label: 'Archive' },
]

const allActions: MessageAction[] = ['ai', 'edit', 'retry', 'copy']

// ── Default (matches Figma) ─────────────────────────────────────────────────

export const Default: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState('recent')
    return (
      <ChatPanel
        title="Group chat"
        tabs={defaultTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onClose={() => {}}
      >
        <ChatPanelSection>
          <Message
            type="audio"
            sent={false}
            senderName="Orlando Diggs"
            senderStatus="online"
            timestamp="Thursday 10:16am"
            duration="00:28"
          />
          <Message
            type="message"
            sent={false}
            senderName="Lana Steiner"
            senderStatus="online"
            timestamp="Thursday 11:40am"
            content="Hey team, I've finished with the requirements doc!"
          />
          <Message
            type="file"
            sent={false}
            senderName="Lana Steiner"
            senderStatus="online"
            timestamp="Thursday 11:40am"
            fileName="Tech requirements.pdf"
            fileSize="1.2 MB"
            fileExtension="pdf"
          />
          <Message
            type="message"
            sent
            senderName="You"
            timestamp="Thursday 11:41am"
            status="read"
            content="Awesome! Thanks."
          />
          <Message
            type="message"
            sent={false}
            senderName="Demi Wilkinson"
            senderStatus="online"
            timestamp="Thursday 11:44am"
            content="Good timing — was just looking at this."
            actions={allActions}
          />
        </ChatPanelSection>

        <ChatPanelDivider label="Today" />

        <ChatPanelSection>
          <Message
            type="message"
            sent={false}
            senderName="Phoenix Baker"
            senderStatus="online"
            timestamp="Friday 2:20pm"
            content="Hey Olivia, can you please review the latest design?"
          />
          <Message
            type="message"
            sent
            senderName="You"
            timestamp="Friday 2:20pm"
            status="sent"
            content="Sure thing, I'll have a look today."
          />
        </ChatPanelSection>
      </ChatPanel>
    )
  },
}

// ── Empty state ─────────────────────────────────────────────────────────────

export const Empty: Story = {
  name: 'Empty',
  render: () => {
    const [activeTab, setActiveTab] = useState('recent')
    return (
      <ChatPanel
        title="Group chat"
        tabs={defaultTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onClose={() => {}}
      >
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-sm text-tertiary">No messages yet</p>
          <p className="text-xs text-quaternary">Start the conversation</p>
        </div>
      </ChatPanel>
    )
  },
}

// ── Without tabs ────────────────────────────────────────────────────────────

export const WithoutTabs: Story = {
  name: 'Without Tabs',
  render: () => (
    <ChatPanel title="Direct Message" onClose={() => {}}>
      <ChatPanelSection>
        <Message
          type="message"
          sent={false}
          senderName="Phoenix Baker"
          senderStatus="online"
          timestamp="2:20pm"
          content="Hey, quick question about the API integration..."
        />
        <Message
          type="message"
          sent
          senderName="You"
          timestamp="2:22pm"
          status="read"
          content="Sure, what's up?"
        />
        <Message
          type="message"
          sent={false}
          senderName="Phoenix Baker"
          senderStatus="online"
          timestamp="2:23pm"
          content="Can you check the auth endpoint? Getting 403s on staging."
        />
      </ChatPanelSection>
    </ChatPanel>
  ),
}

// ── With typing indicator ───────────────────────────────────────────────────

export const WithTyping: Story = {
  name: 'With Typing',
  render: () => {
    const [activeTab, setActiveTab] = useState('recent')
    return (
      <ChatPanel
        title="Group chat"
        tabs={defaultTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onClose={() => {}}
      >
        <ChatPanelSection>
          <Message
            type="message"
            sent={false}
            senderName="Phoenix Baker"
            senderStatus="online"
            timestamp="2:20pm"
            content="Hey Olivia, can you please review the latest design?"
          />
          <Message
            type="message"
            sent
            senderName="You"
            timestamp="2:22pm"
            status="read"
            content="Sure thing, I'll have a look today."
          />
          <Message
            type="writing"
            senderName="Phoenix Baker"
            senderStatus="online"
            timestamp=""
          />
        </ChatPanelSection>
      </ChatPanel>
    )
  },
}
