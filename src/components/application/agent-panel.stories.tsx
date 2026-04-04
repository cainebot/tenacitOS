import type { Meta, StoryObj } from '@storybook/react'
import {
  AgentPanel,
  AgentPanelSection,
  AgentPanelDivider,
} from './agent-panel'
import { Message } from './message'
import type { MessageAction } from './message-action-panel'

const allActions: MessageAction[] = ['ai', 'edit', 'retry', 'copy']

const meta: Meta<typeof AgentPanel> = {
  title: 'Application/AgentPanel',
  component: AgentPanel,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="h-screen w-[440px] ml-auto">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof AgentPanel>

// ── Default — matches Figma node 16806:44143 ─────────────────────────────

export const Default: Story = {
  render: () => (
    <AgentPanel
      name="Pomni"
      role="Scrum master"
      avatarSrc="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni"
      isOnline
    >
      <AgentPanelSection>
        <Message
          type="message"
          senderName="Anita Cruz"
          senderStatus="online"
          timestamp="Thursday 10:16am"
          content="Hey Olivia. We're working on a dashboard prototype and love your work. Are you open to new projects?"
        />
        <Message
          type="message"
          sent
          senderName="You"
          timestamp="Thursday 11:41am"
          status="read"
          content="Hey Anita, I have some capacity in a few weeks. Can you tell me a little more about the project?"
        />
        <Message
          type="message"
          senderName="Anita Cruz"
          senderStatus="online"
          timestamp="Thursday 12:14pm"
          content="Great! We've drafted an outline here. Let me know if you have any questions!"
        />
        <Message
          type="file"
          senderName="Anita Cruz"
          senderStatus="online"
          timestamp="Thursday 12:14pm"
          fileName="Dashboard Design Brief.pdf"
          fileSize="800 KB"
          fileExtension="pdf"
        />
        <Message
          type="message"
          sent
          senderName="You"
          timestamp="Thursday 12:29pm"
          status="read"
          content="I'll have a more thorough read and get back to you by tomorrow. Is that okay?"
          reactions={[{ emoji: '❤️' }, { emoji: '👌' }]}
        />
        <Message
          type="link-preview"
          senderName="Pomni"
          senderAvatar="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni"
          senderStatus="online"
          timestamp="Thursday 12:30pm"
          url="https://www.untitledui.com"
          imageSrc="https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=600&h=315&fit=crop"
        />
      </AgentPanelSection>

      <AgentPanelDivider label="Today" />

      <AgentPanelSection>
        <Message
          type="message"
          sent
          senderName="You"
          timestamp="10 mins ago"
          status="read"
          content={"Hey Anita, I've had a read through and made some notes:\nhttps://docs.google.com/docu..."}
          actions={allActions}
        />
        <Message
          type="message"
          senderName="Pomni"
          senderAvatar="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni"
          senderStatus="online"
          timestamp="Just now"
          content="Thank you for the quick turnaround. Looking now."
        />
        <Message
          type="writing"
          senderName="Pomni"
          senderAvatar="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni"
          senderStatus="online"
          timestamp=""
        />
      </AgentPanelSection>
    </AgentPanel>
  ),
}

// ── Typing ────────────────────────────────────────────────────────────────

export const Typing: Story = {
  render: () => (
    <AgentPanel
      name="Pomni"
      role="Scrum master"
      avatarSrc="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni"
      isOnline
    >
      <AgentPanelSection>
        <Message
          type="message"
          senderName="Pomni"
          senderAvatar="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni"
          senderStatus="online"
          timestamp="2:20pm"
          content="Hey, I've finished the sprint retrospective notes."
        />
        <Message
          type="message"
          sent
          senderName="You"
          timestamp="2:22pm"
          status="read"
          content="Thanks! Can you share the action items?"
        />
        <Message
          type="writing"
          senderName="Pomni"
          senderAvatar="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni"
          senderStatus="online"
          timestamp=""
        />
      </AgentPanelSection>
    </AgentPanel>
  ),
}

// ── Offline ───────────────────────────────────────────────────────────────

export const Offline: Story = {
  args: {
    name: 'Pomni',
    role: 'Scrum master',
    avatarSrc: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni',
    isOnline: false,
  },
}

// ── Empty ─────────────────────────────────────────────────────────────────

export const Empty: Story = {
  args: {
    name: 'Pomni',
    role: 'Scrum master',
    avatarSrc: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni',
    isOnline: true,
  },
}

// ── With files and audio ──────────────────────────────────────────────────

export const WithFileAndAudio: Story = {
  render: () => (
    <AgentPanel
      name="Pomni"
      role="Scrum master"
      avatarSrc="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni"
      isOnline
    >
      <AgentPanelSection>
        <Message
          type="file"
          senderName="Pomni"
          senderAvatar="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni"
          senderStatus="online"
          timestamp="9:00am"
          fileName="Sprint Planning Notes.pdf"
          fileSize="1.2 MB"
          fileExtension="pdf"
        />
        <Message
          type="audio"
          senderName="Pomni"
          senderAvatar="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni"
          senderStatus="online"
          timestamp="9:05am"
          duration="00:28"
        />
        <Message
          type="message"
          sent
          senderName="You"
          timestamp="9:10am"
          status="delivered"
          content="Got it, reviewing now."
        />
      </AgentPanelSection>
    </AgentPanel>
  ),
}

// ── With profile content ──────────────────────────────────────────────────

export const WithProfile: Story = {
  render: () => (
    <AgentPanel
      name="Pomni"
      role="Scrum master"
      avatarSrc="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni"
      isOnline
      profileTab={
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
      }
    >
      <AgentPanelSection>
        <Message
          type="message"
          senderName="Pomni"
          senderAvatar="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=pomni"
          senderStatus="online"
          timestamp="Just now"
          content="Ready for the standup!"
        />
      </AgentPanelSection>
    </AgentPanel>
  ),
}
