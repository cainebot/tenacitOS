'use client'

import { type FC } from 'react'
import { AvatarLabelGroup, BadgeWithDot, cx } from '@circos/ui'

// ---------------------------------------------------------------------------
// OrgNode — shared tree node interface used by TeamChart and TeamChartSidePanel
// ---------------------------------------------------------------------------

export interface OrgNode {
  agent_id: string
  name: string
  emoji: string
  avatar_url: string | null
  title: string | null
  role: string | null
  status: string
  reports_to: string | null
  children: OrgNode[]
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

type BadgeColor = 'gray' | 'success' | 'error'

function statusBadgeColor(status: string): BadgeColor {
  if (status === 'working') return 'success'
  if (status === 'blocked' || status === 'error') return 'error'
  return 'gray'
}

function statusLabel(status: string): string {
  if (status === 'idle') return 'Idle'
  if (status === 'working') return 'Working'
  if (status === 'blocked') return 'Blocked'
  if (status === 'error') return 'Error'
  if (status === 'offline') return 'Offline'
  if (status === 'thinking') return 'Thinking'
  if (status === 'queued') return 'Queued'
  return status
}

// ---------------------------------------------------------------------------
// TeamChartNode component
// ---------------------------------------------------------------------------

interface TeamChartNodeProps {
  node: OrgNode
  isProjectLead: boolean
  isSelected: boolean
  onSelect: (agentId: string) => void
}

export const TeamChartNode: FC<TeamChartNodeProps> = ({
  node,
  isProjectLead,
  isSelected,
  onSelect,
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(node.agent_id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(node.agent_id)
        }
      }}
      className={cx(
        'bg-secondary rounded-lg p-4 min-w-[160px] max-w-[200px] cursor-pointer',
        'border transition-colors',
        isProjectLead && 'ring-1 ring-[color:var(--color-border-brand)]',
        isSelected
          ? 'border-[color:var(--color-border-brand)]'
          : 'border-secondary hover:border-primary',
      )}
    >
      {/* Avatar + name + subtitle */}
      <AvatarLabelGroup
        src={node.avatar_url ?? undefined}
        initials={node.emoji}
        title={node.name}
        subtitle={node.title ?? node.role ?? ''}
        size="sm"
      />

      {/* Status badge */}
      <div className="mt-3">
        <BadgeWithDot color={statusBadgeColor(node.status)} size="sm">
          {statusLabel(node.status)}
        </BadgeWithDot>
      </div>
    </div>
  )
}
