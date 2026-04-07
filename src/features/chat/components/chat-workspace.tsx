'use client'

import { useState, useEffect, useRef } from 'react'
import { cx, Button, SIDEBAR } from '@circos/ui'
import { Edit02, XClose } from '@untitledui/icons'
import { ConversationList } from './conversation-list'
import { useConversations } from '../hooks/use-conversations'

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatWorkspaceProps {
  onClose: () => void
  initialConversationId?: string | null
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChatWorkspace({ onClose, initialConversationId }: ChatWorkspaceProps) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversationId ?? null,
  )
  const { channels, dms, loading, error, refetch } = useConversations()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Dismiss on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Focus close button on mount
  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 bg-overlay/20"
      onClick={onClose}
    >
      <div
        className="absolute top-0 right-0 bottom-0 flex bg-primary shadow-2xl"
        style={{ left: SIDEBAR.SLIM_WIDTH }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left list panel */}
        <div className="w-[260px] shrink-0 flex flex-col border-r border-secondary h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-3 border-b border-secondary shrink-0">
            <p className="text-sm font-semibold text-primary">Chat</p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                color="tertiary"
                iconLeading={Edit02}
                onClick={() => {}}
                aria-label="New message"
              >
                New
              </Button>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className={cx(
                  'flex items-center justify-center size-8 rounded-md',
                  'text-fg-quaternary hover:bg-primary_hover',
                  'transition duration-100 ease-linear',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                )}
                aria-label="Close chat"
              >
                <XClose className="size-4" />
              </button>
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              channels={channels}
              dms={dms}
              loading={loading}
              error={error}
              activeConversationId={activeConversationId}
              onSelectConversation={setActiveConversationId}
              onRetry={refetch}
            />
          </div>
        </div>

        {/* Right conversation view */}
        <div className="flex-1 flex flex-col h-full">
          {activeConversationId ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-tertiary">
                Conversation view coming in Plan 03
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <p className="text-sm font-semibold text-primary">Select a conversation</p>
              <p className="text-sm text-tertiary">
                Choose from your channels or direct messages to start chatting.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
