import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ChatInput, type ChatInputPayload, type ChatShortcut } from './chat-input'
import { Zap, FileSearch02, Globe01, Edit04, RefreshCcw02 } from '@untitledui/icons'

const sampleShortcuts: ChatShortcut[] = [
  { id: 'summarize', label: 'summarize', description: 'Summarize the conversation', icon: FileSearch02 },
  { id: 'translate', label: 'translate', description: 'Translate to another language', icon: Globe01 },
  { id: 'draft', label: 'draft-email', description: 'Draft an email response', icon: Edit04 },
  { id: 'rephrase', label: 'rephrase', description: 'Rephrase the last message', icon: RefreshCcw02 },
  { id: 'action', label: 'action-items', description: 'Extract action items', icon: Zap },
]

const meta: Meta<typeof ChatInput> = {
  title: 'Application/ChatInput',
  component: ChatInput,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    type: { control: 'inline-radio', options: ['minimal', 'textarea', 'advanced'] },
    placeholder: { control: 'text' },
    isDisabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof ChatInput>

export const Minimal: Story = {
  args: { type: 'minimal' },
}

export const TextareaInput: Story = {
  args: { type: 'textarea', shortcuts: sampleShortcuts },
}

export const Advanced: Story = {
  args: {
    type: 'advanced',
    userName: 'Olivia',
    avatarSrc: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=64&h=64&fit=crop&crop=faces',
    shortcuts: sampleShortcuts,
  },
}

export const Disabled: Story = {
  args: { type: 'textarea', isDisabled: true },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex w-[400px] flex-col gap-6">
      <div>
        <p className="mb-2 text-xs font-semibold text-tertiary">Minimal</p>
        <ChatInput type="minimal" />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold text-tertiary">Textarea input (type / for shortcuts)</p>
        <ChatInput type="textarea" shortcuts={sampleShortcuts} />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold text-tertiary">Advanced (type / for shortcuts)</p>
        <ChatInput
          type="advanced"
          userName="Olivia"
          avatarSrc="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=64&h=64&fit=crop&crop=faces"
          shortcuts={sampleShortcuts}
        />
      </div>
    </div>
  ),
}

export const Interactive: Story = {
  render: () => {
    const [messages, setMessages] = useState<ChatInputPayload[]>([])

    return (
      <div className="flex flex-col gap-4">
        {messages.length > 0 && (
          <div className="flex flex-col gap-2 rounded-md border border-secondary bg-secondary p-3">
            <p className="text-xs font-semibold text-tertiary">Sent messages:</p>
            {messages.map((msg, i) => (
              <div key={i} className="rounded-md bg-primary p-2">
                {msg.command && (
                  <span className="mr-1 inline-block rounded-md bg-brand-solid/10 px-1.5 py-0.5 text-xs font-medium text-brand-secondary">
                    /{msg.command}
                  </span>
                )}
                <p className="text-sm text-primary">{msg.text || '(no text)'}</p>
                {msg.images.length > 0 && (
                  <p className="mt-1 text-xs text-tertiary">
                    {msg.images.length} image{msg.images.length > 1 ? 's' : ''} attached
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <ChatInput
          placeholder="Type / for shortcuts..."
          shortcuts={sampleShortcuts}
          onSend={(payload) => setMessages((prev) => [...prev, payload])}
        />
      </div>
    )
  },
}
