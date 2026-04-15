'use client'

import { FeedItem, FeedItemLink, Badge } from '@circos/ui'
import { ArrowRight } from '@untitledui/icons'
import type { ChatTimelineEventData } from './types'

interface ChatTimelineEventProps {
  data: ChatTimelineEventData
  connector?: boolean
}

function StatusLabel({ value }: { value: string | null }) {
  if (!value) return <span className="text-quaternary">none</span>
  const colorMap: Record<string, 'gray' | 'brand' | 'success' | 'warning' | 'error'> = {
    todo: 'gray',
    in_progress: 'brand',
    done: 'success',
    in_review: 'warning',
    cancelled: 'error',
  }
  return (
    <Badge size="sm" color={colorMap[value] ?? 'gray'} type="pill-color">
      {value.replace(/_/g, ' ')}
    </Badge>
  )
}

export function ChatTimelineEvent({ data, connector = false }: ChatTimelineEventProps) {
  const timeAgo = formatRelativeTime(data.createdAt)

  const action = (
    <>
      {data.statusChange && (
        <span className="inline-flex items-center gap-1.5">
          changed status from <StatusLabel value={data.statusChange.from} />
          <ArrowRight className="size-3 text-quaternary" />
          <StatusLabel value={data.statusChange.to} />
        </span>
      )}
      {data.assigneeChange && (
        <span className="inline-flex items-center gap-1.5">
          {data.assigneeChange.from ? (
            <>
              reassigned from{' '}
              <FeedItemLink>{data.assigneeChange.from}</FeedItemLink>
              {' to '}
            </>
          ) : (
            <>assigned to </>
          )}
          <FeedItemLink>{data.assigneeChange.to}</FeedItemLink>
        </span>
      )}
    </>
  )

  return (
    <FeedItem
      avatarInitials={data.actorInitials}
      name={data.actorName}
      timestamp={timeAgo}
      action={action}
      size="sm"
      connector={connector}
    />
  )
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
