'use client'

import { useEffect, useRef, useState } from 'react'
import { Avatar, cx, SIDEBAR } from '@circos/ui'
import { Announcement03, ChevronDown, Hash02 } from '@untitledui/icons'
import type { ConversationWithMeta } from '../hooks/use-conversations'

interface ChatHoverMenuProps {
  channels: ConversationWithMeta[]
  dms: ConversationWithMeta[]
  onSelectConversation: (conversationId: string) => void
  onSelectAgent: (agentId: string, agentName: string) => void
  onOpenWorkspace: () => void
  onHoverEnter: () => void
  onHoverLeave: () => void
  onClose: () => void
}

function SectionHeader({ label, isOpen, onToggle }: { label: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-[5px] px-4 shrink-0 w-full text-left"
    >
      <span className="text-sm font-medium text-tertiary">{label}</span>
      <ChevronDown className={cx('size-4 text-fg-tertiary transition duration-100 ease-linear', !isOpen && '-rotate-90')} />
    </button>
  )
}

function MenuItem({
  icon,
  avatar,
  label,
  badge,
  onClick,
}: {
  icon?: React.ReactNode
  avatar?: string | null
  label: string
  badge?: number
  onClick: () => void
}) {
  return (
    <div className="flex items-center px-1.5 shrink-0 w-full">
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 gap-3 items-center overflow-clip p-2 rounded-sm text-left cursor-pointer hover:bg-primary_hover transition duration-100 ease-linear"
      >
        <div className="flex flex-1 gap-2 items-center min-w-0">
          {icon}
          {avatar !== undefined && (
            <Avatar src={avatar ?? undefined} alt={label} size="xs" status="online" />
          )}
          <span className="flex-1 text-sm font-semibold text-secondary truncate">{label}</span>
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="flex items-start border border-secondary rounded-xs px-1 py-px text-xs font-medium text-tertiary shrink-0">
            {badge}
          </span>
        )}
      </button>
    </div>
  )
}

export function ChatHoverMenu({ channels, dms, onSelectConversation, onSelectAgent, onOpenWorkspace, onHoverEnter, onHoverLeave, onClose }: ChatHoverMenuProps) {
  const [announcementsOpen, setAnnouncementsOpen] = useState(true)
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [dmsOpen, setDmsOpen] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)

  const announcements = channels.filter(c => c.conversation_type === 'broadcast')
  const groupChannels = channels.filter(c => c.conversation_type === 'group')

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] flex flex-col items-start bg-secondary border border-[rgba(0,0,0,0.08)] rounded-xl shadow-lg overflow-clip w-[304px] min-h-[600px]"
      style={{ left: SIDEBAR.EXPANDED_WITH_PAD + 4, top: 120 }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      {/* Header */}
      <div className="flex items-center px-4 py-2 shrink-0 w-full">
        <p className="flex-1 text-lg font-semibold text-primary">Chat</p>
      </div>

      {/* Announcement section — Menu items wrapper */}
      <div className="flex flex-col items-start w-full">
        <div className="flex flex-col gap-0.5 items-start overflow-clip py-1.5 w-full">
          <SectionHeader label="Announcement" isOpen={announcementsOpen} onToggle={() => setAnnouncementsOpen(v => !v)} />
          {announcementsOpen && announcements.map(c => (
            <MenuItem
              key={c.conversation_id}
              icon={<Announcement03 className="size-5 text-fg-tertiary shrink-0" />}
              label={c.title ?? 'Announcement'}
              onClick={() => onSelectConversation(c.conversation_id)}
            />
          ))}
        </div>
      </div>

      {/* Channels section — Menu items wrapper */}
      <div className="flex flex-col items-start w-full">
        <div className="flex flex-col gap-0.5 items-start overflow-clip py-1.5 w-full">
          <SectionHeader label="Channels" isOpen={channelsOpen} onToggle={() => setChannelsOpen(v => !v)} />
          {channelsOpen && groupChannels.map(c => (
            <MenuItem
              key={c.conversation_id}
              icon={<Hash02 className="size-5 text-fg-tertiary shrink-0" />}
              label={c.title ?? 'Channel'}
              onClick={() => onSelectConversation(c.conversation_id)}
            />
          ))}
        </div>
      </div>

      {/* Direct Messages section — Menu items wrapper */}
      <div className="flex flex-col items-start w-full">
        <div className="flex flex-col gap-0.5 items-start overflow-clip py-1.5 w-full">
          <SectionHeader label="Direct Messages" isOpen={dmsOpen} onToggle={() => setDmsOpen(v => !v)} />
          {dmsOpen && (
            <>
              {dms.map(c => (
                <MenuItem
                  key={c.conversation_id}
                  avatar={c.agent_avatar ?? null}
                  label={c.agent_name ?? c.title ?? 'DM'}
                  badge={c.unread_count}
                  onClick={() => {
                    if (c.agent_id) {
                      onSelectAgent(c.agent_id, c.agent_name ?? c.title ?? 'Agent')
                    } else {
                      onSelectConversation(c.conversation_id)
                    }
                  }}
                />
              ))}
              <MenuItem
                label="See all"
                onClick={onOpenWorkspace}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
