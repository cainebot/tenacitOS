'use client'

import { Avatar, BadgeWithDot, cx } from '@circos/ui'
import type { ChatRunMarkerData } from './types'

const statusConfig: Record<
  ChatRunMarkerData['status'],
  { label: string; color: 'gray' | 'brand' | 'success' | 'warning' | 'error' }
> = {
  running: { label: 'Running', color: 'brand' },
  succeeded: { label: 'Succeeded', color: 'success' },
  failed: { label: 'Failed', color: 'error' },
  timed_out: { label: 'Timed out', color: 'warning' },
  cancelled: { label: 'Cancelled', color: 'gray' },
}

interface ChatRunMarkerProps {
  data: ChatRunMarkerData
}

export function ChatRunMarker({ data }: ChatRunMarkerProps) {
  const config = statusConfig[data.status]

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-secondary bg-secondary/30 px-3 py-2">
      <Avatar size="xs" initials={data.agentInitials} />
      <span className="text-xs font-medium text-secondary">{data.agentName}</span>
      <span className="text-xs text-quaternary">started a run</span>
      <BadgeWithDot size="sm" color={config.color} type="pill-color">
        {config.label}
      </BadgeWithDot>
      {data.durationLabel && (
        <span className="ml-auto text-xs text-quaternary">{data.durationLabel}</span>
      )}
    </div>
  )
}
