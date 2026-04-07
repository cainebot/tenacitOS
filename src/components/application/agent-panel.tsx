'use client'

import { type ReactNode, useRef, useEffect } from 'react'
import {
  Avatar,
  BadgeWithDot,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  cx,
} from '@circos/ui'
import {
  MessageCircle01,
  UserSquare,
  Data,
  Settings03,
  LayoutRight,
} from '@untitledui/icons'
import { ChatInput, type ChatInputPayload } from './chat-input'

// ── Types ────────────────────────────────────────────────────────────────────

export type { ChatInputPayload }

export interface AgentPanelProps {
  /** Agent display name */
  name: string
  /** Agent role subtitle */
  role: string
  /** Avatar image URL */
  avatarSrc?: string
  /** Online status — controls badge in header and avatar indicators */
  isOnline?: boolean
  /** Chat tab content — compose with Message, AgentPanel.Section, AgentPanel.Divider */
  children?: ReactNode
  /** Called when the settings gear is pressed */
  onSettingsPress?: () => void
  /** Called when the collapse/close button is pressed */
  onClose?: () => void
  /** Called when a message is sent from the input */
  onSend?: (payload: ChatInputPayload) => void
  /**
   * When true, AgentPanel does NOT render its own ChatInput.
   * Use this when the consumer (e.g. AgentChatTab) renders ChatInput itself.
   */
  hideInput?: boolean
  /** Content rendered in the Profile tab */
  profileTab?: ReactNode
  /** Content rendered in the Skills tab */
  skillsTab?: ReactNode
  className?: string
}

// ── Layout helpers ──────────────────────────────────────────────────────────

/** Groups messages within a date section — gap-4 between items */
export function AgentPanelSection({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 w-full">{children}</div>
}

/** Horizontal divider with centered label (e.g. "Today") */
export function AgentPanelDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-px bg-secondary" />
      <span className="text-sm font-medium text-tertiary shrink-0">{label}</span>
      <div className="flex-1 h-px bg-secondary" />
    </div>
  )
}

// ── AgentPanel ──────────────────────────────────────────────────────────────

export function AgentPanel({
  name,
  role,
  avatarSrc,
  isOnline = false,
  children,
  onSettingsPress,
  onClose,
  onSend,
  hideInput = false,
  profileTab,
  skillsTab,
  className,
}: AgentPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when chat content changes
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [children])

  return (
    <Tabs
      defaultSelectedKey="chat"
      className={cx(
        'bg-secondary_alt border-l border-secondary flex flex-col h-full',
        className,
      )}
    >
      {/* ── Header — Figma: Card header, backdrop-blur, absolute top ─── */}
      <div className="shrink-0 z-10 bg-primary/[.92] backdrop-blur">
        {/* Agent info — Figma: pt-5 px-6, gap-4 between avatar-text and actions */}
        <div className="flex gap-4 items-start pt-5 px-6">
          <div className="flex flex-1 gap-3 items-start min-w-0">
            <Avatar
              size="xl"
              src={avatarSrc}
              alt={name}
              contrastBorder
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary whitespace-nowrap">
                  {name}
                </span>
                <BadgeWithDot
                  color={isOnline ? 'success' : 'gray'}
                  size="sm"
                >
                  {isOnline ? 'Online' : 'Offline'}
                </BadgeWithDot>
              </div>
              <p className="text-sm text-tertiary truncate">{role}</p>
            </div>
          </div>

          {/* Actions — Settings + Collapse */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onSettingsPress}
              className="p-2.5 rounded-lg hover:bg-primary_hover transition duration-100 ease-linear"
            >
              <Settings03 className="size-5 text-fg-quaternary" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-lg hover:bg-primary_hover transition duration-100 ease-linear"
            >
              <LayoutRight className="size-5 text-fg-quaternary" />
            </button>
          </div>
        </div>

        {/* Tabs — Figma: Horizontal tabs, underline, sm, fullWidth */}
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

      {/* ── Chat tab ─────────────────────────────────────────────────── */}
      <TabPanel id="chat" className="flex-1 flex flex-col overflow-hidden p-0 min-h-0">
        {/* Scrollable messages — Figma: justify-end, gap-8, px-6 pb-6 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
          <div className="flex flex-col justify-end min-h-full gap-8 px-6 pb-6">
            {children}
          </div>
        </div>

        {/* Message input — Figma: ChatInput advanced, px-5 pb-4 */}
        {!hideInput && (
          <div className="shrink-0 px-5 pb-4">
            <ChatInput
              type="advanced"
              avatarSrc={avatarSrc}
              userName={name}
              onSend={onSend}
            />
          </div>
        )}
      </TabPanel>

      {/* ── Profile tab ──────────────────────────────────────────────── */}
      <TabPanel id="profile" className="flex-1 overflow-y-auto p-6">
        {profileTab ?? (
          <p className="text-sm text-tertiary">No profile data available.</p>
        )}
      </TabPanel>

      {/* ── Skills tab ───────────────────────────────────────────────── */}
      <TabPanel id="skills" className="flex-1 overflow-y-auto p-6">
        {skillsTab ?? (
          <p className="text-sm text-tertiary">No skills data available.</p>
        )}
      </TabPanel>
    </Tabs>
  )
}
