'use client'

import { useRef, useEffect, type ReactNode } from 'react'
import { cx } from '@circos/ui'
import { XClose } from '@untitledui/icons'
import { Button as AriaButton } from 'react-aria-components'
import { ChatInput, type ChatInputPayload } from './chat-input'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChatPanelTab {
  id: string
  label: string
}

export interface ChatPanelProps {
  /** Panel title displayed in the header */
  title?: string
  /** Filter tabs rendered below the title */
  tabs?: ChatPanelTab[]
  /** Controlled active tab id */
  activeTab?: string
  /** Called when a tab is selected */
  onTabChange?: (tabId: string) => void
  /** Chat content — compose with Message, ChatPanelSection, ChatPanelDivider */
  children?: ReactNode
  /** Called when user sends a message from the input */
  onSendMessage?: (payload: ChatInputPayload) => void
  /** Close button handler — button hidden when omitted */
  onClose?: () => void
  /** Input placeholder */
  placeholder?: string
  className?: string
  /** Custom footer content. When provided, replaces the built-in ChatInput footer.
      When `false`, suppresses footer entirely. When omitted, renders default minimal ChatInput. */
  footer?: ReactNode | false
}

// ── Sub-components ──────────────────────────────────────────────────────────

/** Groups messages within a date section with gap-4 spacing */
export function ChatPanelSection({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 w-full">{children}</div>
}

/** Date or label divider between message sections */
export function ChatPanelDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-px bg-secondary" />
      <span className="text-sm font-medium text-tertiary shrink-0">{label}</span>
      <div className="flex-1 h-px bg-secondary" />
    </div>
  )
}

// ── Chat Panel ──────────────────────────────────────────────────────────────

export function ChatPanel({
  title = 'Group chat',
  tabs,
  activeTab,
  onTabChange,
  children,
  onSendMessage,
  onClose,
  placeholder = 'Message',
  className,
  footer,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [children])

  return (
    <div
      className={cx(
        'bg-primary border-l border-secondary flex flex-col h-full overflow-clip shadow-xl',
        className,
      )}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div className="shrink-0 bg-primary border-b border-secondary flex flex-col gap-5 px-6 pt-6 pb-4">
        <div className="flex items-start gap-4">
          <h2 className="flex-1 text-lg font-semibold text-primary leading-7">
            {title}
          </h2>
          {onClose && (
            <AriaButton
              onPress={onClose}
              className={cx(
                'flex items-center justify-center size-10 -mt-1 -mr-2 rounded-md shrink-0',
                'hover:bg-primary_hover transition duration-100 ease-linear',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
              )}
              aria-label="Close"
            >
              <XClose className="size-5 text-fg-quaternary" />
            </AriaButton>
          )}
        </div>

        {tabs && tabs.length > 0 && (
          <div className="flex gap-0.5 rounded-md border border-secondary bg-secondary w-full">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange?.(tab.id)}
                  className={cx(
                    'flex-1 flex items-center justify-center h-9 rounded-md text-sm font-semibold',
                    'transition-colors duration-200 ease-in-out',
                    isActive
                      ? 'bg-primary border border-primary shadow-xs text-secondary'
                      : 'text-quaternary hover:text-secondary',
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Messages area ────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col justify-end min-h-full gap-8 px-6 py-6">
          {children}
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      {footer !== false && (
        <div className="shrink-0 border-t border-secondary bg-primary px-6 py-4">
          {footer ?? (
            <ChatInput
              type="minimal"
              placeholder={placeholder}
              onSend={onSendMessage}
            />
          )}
        </div>
      )}
    </div>
  )
}
