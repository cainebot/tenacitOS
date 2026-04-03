'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import {
  Avatar,
  Badge,
  BadgeWithDot,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  FileTypeIcon,
  cx,
} from '@circos/ui'
import {
  MessageCircle01,
  UserSquare,
  Data,
  Settings03,
  Attachment01,
  Type01,
  Microphone02,
} from '@untitledui/icons'
import { MessageActionPanel } from './message-action-panel'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AgentMessage {
  id: string
  sender: 'agent' | 'user'
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: string
  status?: 'sent' | 'delivered' | 'read'
  attachment?: {
    type: 'file' | 'link'
    fileName?: string
    fileSize?: string
    fileType?: string
    url?: string
    ogImage?: string
  }
  reactions?: Array<{ emoji: string; count?: number }>
}

export interface AgentPanelAgent {
  id: string
  name: string
  role: string
  avatar?: string
  status: 'online' | 'offline'
}

interface AgentPanelProps {
  agent: AgentPanelAgent
  messages: AgentMessage[]
  isTyping?: boolean
  onSendMessage?: (text: string) => void
  onClose?: () => void
  className?: string
  /** Content for the Profile tab */
  profileContent?: ReactNode
  /** Content for the Skills tab */
  skillsContent?: ReactNode
}

// ── Message row ──────────────────────────────────────────────────────────────

function MessageRow({ message }: { message: AgentMessage }) {
  const [showActions, setShowActions] = useState(false)
  const isUser = message.sender === 'user'

  return (
    <div
      className={cx('flex items-start gap-3', isUser && 'justify-end pl-8')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Agent avatar */}
      {!isUser && (
        <Avatar
          size="md"
          src={message.senderAvatar}
          alt={message.senderName}
          status="online"
          contrastBorder
        />
      )}

      <div
        className={cx(
          'flex flex-col gap-1.5 min-w-0',
          isUser ? 'items-end max-w-[75%]' : 'flex-1 max-w-[80%]'
        )}
      >
        {/* Name + time */}
        <div className="flex items-center gap-2 w-full">
          <span className="text-sm font-medium text-secondary truncate">
            {isUser ? 'You' : message.senderName}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-tertiary">{message.timestamp}</span>
            {isUser && message.status === 'read' && (
              <ReadStatusIcon />
            )}
          </div>
        </div>

        {/* Bubble */}
        <div
          className={cx(
            'relative bg-primary border border-secondary px-3 py-2 w-full',
            isUser
              ? 'rounded-bl-lg rounded-br-lg rounded-tl-lg'
              : 'rounded-bl-lg rounded-br-lg rounded-tr-lg'
          )}
        >
          {/* Text content */}
          {message.content && (
            <p className="text-md text-primary leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          )}

          {/* File attachment */}
          {message.attachment?.type === 'file' && (
            <div className="flex items-start gap-3">
              <FileTypeIcon
                fileType={message.attachment.fileType ?? 'PDF'}
                size="md"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-secondary truncate">
                  {message.attachment.fileName}
                </span>
                <span className="text-sm text-tertiary">
                  {message.attachment.fileSize}
                </span>
              </div>
            </div>
          )}

          {/* Link preview */}
          {message.attachment?.type === 'link' && (
            <div className="flex flex-col gap-1.5">
              {message.attachment.ogImage && (
                <div className="rounded-md border border-[rgba(0,0,0,0.1)] overflow-hidden aspect-[1200/630]">
                  <img
                    src={message.attachment.ogImage}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>
              )}
              {message.attachment.url && (
                <a
                  href={message.attachment.url}
                  className="text-md text-brand-secondary underline truncate"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {message.attachment.url}
                </a>
              )}
            </div>
          )}

          {/* Action panel on hover */}
          {showActions && isUser && (
            <MessageActionPanel className="absolute -bottom-5 right-2 z-10" />
          )}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex items-center gap-1">
            {message.reactions.map((r, i) => (
              <button
                key={i}
                className="bg-secondary border border-secondary rounded-full px-2 py-0.5 flex items-center gap-1 h-6"
              >
                <span className="text-sm">{r.emoji}</span>
                {r.count && r.count > 1 && (
                  <span className="text-xs text-tertiary">{r.count}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Small helpers ────────────────────────────────────────────────────────────

function ReadStatusIcon() {
  return (
    <svg className="size-4 text-fg-brand-primary shrink-0" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 8.5L5.5 12L14 3.5M6 8.5L7.5 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-10" /> {/* spacer matching avatar width */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-secondary">{name}</span>
        <div className="bg-primary border border-secondary rounded-bl-lg rounded-br-lg rounded-tr-lg px-3 py-2.5 flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-tertiary animate-bounce [animation-delay:0ms]" />
          <span className="size-1.5 rounded-full bg-tertiary animate-bounce [animation-delay:150ms]" />
          <span className="size-1.5 rounded-full bg-tertiary animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

function ContentDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-px bg-secondary" />
      <span className="text-sm text-tertiary shrink-0">{label}</span>
      <div className="flex-1 h-px bg-secondary" />
    </div>
  )
}

// ── Agent Panel ──────────────────────────────────────────────────────────────

export function AgentPanel({
  agent,
  messages,
  isTyping = false,
  onSendMessage,
  onClose,
  className,
  profileContent,
  skillsContent,
}: AgentPanelProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = () => {
    const text = inputValue.trim()
    if (!text) return
    onSendMessage?.(text)
    setInputValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  return (
    <Tabs
      defaultSelectedKey="chat"
      className={cx(
        'bg-secondary_alt border-l border-secondary flex flex-col h-full',
        className
      )}
    >
      {/* ── Sticky header ─────────────────────────────────────── */}
      <div className="shrink-0 z-10">
        {/* Agent info */}
        <div className="flex items-start gap-3 pt-5 px-6">
          <Avatar
            size="xl"
            src={agent.avatar}
            alt={agent.name}
            contrastBorder
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-primary">
                {agent.name}
              </span>
              <BadgeWithDot
                color={agent.status === 'online' ? 'success' : 'gray'}
                size="sm"
              >
                {agent.status === 'online' ? 'Online' : 'Offline'}
              </BadgeWithDot>
            </div>
            <p className="text-sm text-tertiary truncate">{agent.role}</p>
          </div>

          {/* Settings button */}
          <button className="p-2.5 rounded-lg hover:bg-primary_hover transition-colors shrink-0">
            <Settings03 className="size-5 text-fg-quaternary" />
          </button>
        </div>

        {/* Tab bar */}
        <TabList type="underline" size="sm" fullWidth>
          <Tab id="chat" className="gap-2">
            <MessageCircle01 className="size-4" />
            Chat
          </Tab>
          <Tab id="profile" className="gap-2">
            <UserSquare className="size-4" />
            Profile
          </Tab>
          <Tab id="skills" className="gap-2">
            <Data className="size-4" />
            Skills
          </Tab>
        </TabList>
      </div>

      {/* ── Chat tab ──────────────────────────────────────────── */}
      <TabPanel id="chat" className="flex-1 flex flex-col overflow-hidden p-0 min-h-0">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <MessageRow key={msg.id} message={msg} />
            ))}
            {isTyping && <TypingIndicator name={agent.name} />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message input */}
        <div className="px-5 pb-4 shrink-0">
          <div className="bg-secondary border border-secondary rounded-xl overflow-hidden">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                rows={3}
                className="w-full bg-transparent px-3.5 py-3 text-md text-primary placeholder:text-placeholder resize-none outline-none"
              />
              <button className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-primary_hover transition-colors">
                <Microphone02 className="size-4 text-fg-quaternary" />
              </button>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-1">
                <Avatar size="xs" src={agent.avatar} alt={agent.name} />
                <button className="flex items-center gap-0.5 text-xs font-semibold text-tertiary hover:text-secondary transition-colors">
                  {agent.name}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1 text-xs font-semibold text-tertiary hover:text-secondary transition-colors">
                  <Type01 className="size-4 text-fg-tertiary" />
                  Shortcuts
                </button>
                <button className="flex items-center gap-1 text-xs font-semibold text-tertiary hover:text-secondary transition-colors">
                  <Attachment01 className="size-4 text-fg-tertiary" />
                  Attach
                </button>
              </div>
            </div>
          </div>
        </div>
      </TabPanel>

      {/* ── Profile tab ───────────────────────────────────────── */}
      <TabPanel id="profile" className="flex-1 overflow-y-auto p-6">
        {profileContent ?? (
          <div className="text-sm text-tertiary">
            Agent profile information will appear here.
          </div>
        )}
      </TabPanel>

      {/* ── Skills tab ────────────────────────────────────────── */}
      <TabPanel id="skills" className="flex-1 overflow-y-auto p-6">
        {skillsContent ?? (
          <div className="text-sm text-tertiary">
            Agent skills and capabilities will appear here.
          </div>
        )}
      </TabPanel>
    </Tabs>
  )
}
