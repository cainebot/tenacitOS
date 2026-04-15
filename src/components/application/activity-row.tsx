'use client'

/**
 * activity-row.tsx
 * Direct port of Paperclip's ActivityRow — adapted for CircOS @circos/ui standards.
 *
 * Changes from Paperclip source:
 *   - cn() → cx() from @circos/ui
 *   - Link from Paperclip router → next/link
 *   - Avatar/AvatarFallback/AvatarImage → Avatar from @circos/ui
 *   - Identity inlined (from Paperclip's Identity.tsx, 39 lines)
 *   - timeAgo inlined (from Paperclip's lib/timeAgo.ts)
 *   - formatActivityVerb inlined (from Paperclip's lib/activity-format.ts)
 *   - ActivityEvent / Agent types defined locally (replaces @paperclipai/shared)
 *   - deriveProjectUrlKey → simple local implementation
 */

import Link from 'next/link'
import { Avatar, cx } from '@circos/ui'

// ---------------------------------------------------------------------------
// Domain types (replaces @paperclipai/shared)
// ---------------------------------------------------------------------------

export interface Agent {
  id: string
  name: string
  icon?: string | null
  avatarUrl?: string | null
}

export interface ActivityEvent {
  id: string
  companyId?: string | null
  actorType: 'user' | 'agent' | 'system'
  actorId: string
  action: string
  entityType: string
  entityId: string
  agentId?: string | null
  runId?: string | null
  details?: Record<string, unknown> | null
  createdAt: Date | string
}

// ---------------------------------------------------------------------------
// Helpers (inlined from Paperclip's lib/)
// ---------------------------------------------------------------------------

function deriveProjectUrlKey(name: string | null | undefined, id: string): string {
  if (name) return name.toLowerCase().replace(/\s+/g, '-')
  return id
}

function entityLink(entityType: string, entityId: string, name?: string | null): string | null {
  switch (entityType) {
    case 'issue': return `/issues/${name ?? entityId}`
    case 'agent': return `/agents/${entityId}`
    case 'project': return `/projects/${deriveProjectUrlKey(name, entityId)}`
    case 'goal': return `/goals/${entityId}`
    case 'approval': return `/approvals/${entityId}`
    default: return null
  }
}

// timeAgo — from Paperclip's lib/timeAgo.ts
const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY

function timeAgo(date: Date | string): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const seconds = Math.round((now - then) / 1000)

  if (seconds < MINUTE) return 'just now'
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m ago`
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)}h ago`
  if (seconds < WEEK) return `${Math.floor(seconds / DAY)}d ago`
  if (seconds < MONTH) return `${Math.floor(seconds / WEEK)}w ago`
  return `${Math.floor(seconds / MONTH)}mo ago`
}

// formatActivityVerb — from Paperclip's lib/activity-format.ts
const ACTIVITY_ROW_VERBS: Record<string, string> = {
  'issue.created': 'created',
  'issue.updated': 'updated',
  'issue.checked_out': 'checked out',
  'issue.released': 'released',
  'issue.comment_added': 'commented on',
  'issue.attachment_added': 'attached file to',
  'issue.attachment_removed': 'removed attachment from',
  'issue.document_created': 'created document for',
  'issue.document_updated': 'updated document on',
  'issue.document_deleted': 'deleted document from',
  'issue.commented': 'commented on',
  'issue.deleted': 'deleted',
  'agent.created': 'created',
  'agent.updated': 'updated',
  'agent.paused': 'paused',
  'agent.resumed': 'resumed',
  'agent.terminated': 'terminated',
  'agent.key_created': 'created API key for',
  'agent.budget_updated': 'updated budget for',
  'agent.runtime_session_reset': 'reset session for',
  'heartbeat.invoked': 'invoked heartbeat for',
  'heartbeat.cancelled': 'cancelled heartbeat for',
  'approval.created': 'requested approval',
  'approval.approved': 'approved',
  'approval.rejected': 'rejected',
  'project.created': 'created',
  'project.updated': 'updated',
  'project.deleted': 'deleted',
  'goal.created': 'created',
  'goal.updated': 'updated',
  'goal.deleted': 'deleted',
  'cost.reported': 'reported cost for',
  'cost.recorded': 'recorded cost for',
  'company.created': 'created company',
  'company.updated': 'updated company',
  'company.archived': 'archived',
  'company.budget_updated': 'updated budget for',
  // CircOS-specific actions
  'card.created': 'created',
  'card.updated': 'updated',
  'card.moved': 'moved',
  'card.completed': 'completed',
  'card.assigned': 'assigned',
  'task.created': 'created',
  'task.completed': 'completed',
  'task.assigned': 'assigned',
}

function formatIssueUpdatedVerb(details: Record<string, unknown> | null | undefined): string | null {
  if (!details) return null
  const previous = (typeof details._previous === 'object' && details._previous !== null ? details._previous : {}) as Record<string, unknown>
  if (details.status !== undefined) {
    const from = previous.status
    return from
      ? `changed status from ${String(from).replace(/_/g, ' ')} to ${String(details.status).replace(/_/g, ' ')} on`
      : `changed status to ${String(details.status).replace(/_/g, ' ')} on`
  }
  if (details.priority !== undefined) {
    const from = previous.priority
    return from
      ? `changed priority from ${String(from).replace(/_/g, ' ')} to ${String(details.priority).replace(/_/g, ' ')} on`
      : `changed priority to ${String(details.priority).replace(/_/g, ' ')} on`
  }
  return null
}

export function formatActivityVerb(
  action: string,
  details?: Record<string, unknown> | null,
  options: { agentMap?: Map<string, Agent>; currentUserId?: string | null } = {},
): string {
  if (action === 'issue.updated' || action === 'card.updated') {
    const verb = formatIssueUpdatedVerb(details)
    if (verb) return verb
  }
  return ACTIVITY_ROW_VERBS[action] ?? action.replace(/[._]/g, ' ')
}

// ---------------------------------------------------------------------------
// Identity — inlined from Paperclip's Identity.tsx
// ---------------------------------------------------------------------------

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function Identity({
  name,
  avatarUrl,
  size = 'default',
  className,
}: {
  name: string
  avatarUrl?: string | null
  size?: 'xs' | 'sm' | 'default'
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5',
        size === 'xs' && 'items-baseline gap-1',
        className,
      )}
    >
      <Avatar
        src={avatarUrl ?? undefined}
        alt={name}
        size={size === 'default' ? 'sm' : size}
        fallback={deriveInitials(name)}
        className={size === 'xs' ? 'relative -top-px' : undefined}
      />
      <span className={cx('truncate', size === 'xs' ? 'text-sm' : 'text-xs')}>{name}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// ActivityRow
// ---------------------------------------------------------------------------

interface ActivityRowProps {
  event: ActivityEvent
  agentMap: Map<string, Agent>
  entityNameMap: Map<string, string>
  entityTitleMap?: Map<string, string>
  className?: string
}

export function ActivityRow({
  event,
  agentMap,
  entityNameMap,
  entityTitleMap,
  className,
}: ActivityRowProps) {
  const verb = formatActivityVerb(event.action, event.details, { agentMap })

  const isHeartbeatEvent = event.entityType === 'heartbeat_run'
  const heartbeatAgentId = isHeartbeatEvent
    ? (event.details as Record<string, unknown> | null)?.agentId as string | undefined
    : undefined

  const name = isHeartbeatEvent
    ? (heartbeatAgentId ? entityNameMap.get(`agent:${heartbeatAgentId}`) : null)
    : entityNameMap.get(`${event.entityType}:${event.entityId}`)

  const entityTitle = entityTitleMap?.get(`${event.entityType}:${event.entityId}`)

  const link = isHeartbeatEvent && heartbeatAgentId
    ? `/agents/${heartbeatAgentId}/runs/${event.entityId}`
    : entityLink(event.entityType, event.entityId, name)

  const actor = event.actorType === 'agent' ? agentMap.get(event.actorId) : null
  const actorName = actor?.name
    ?? (event.actorType === 'system' ? 'System'
      : event.actorType === 'user' ? 'Board'
      : event.actorId || 'Unknown')

  const inner = (
    <div className="flex gap-3">
      <p className="min-w-0 flex-1 truncate">
        <Identity name={actorName} size="xs" className="align-baseline" />
        <span className="text-tertiary ml-1">{verb} </span>
        {name && <span className="font-medium text-primary">{name}</span>}
        {entityTitle && <span className="text-tertiary ml-1">— {entityTitle}</span>}
      </p>
      <span className="shrink-0 pt-0.5 text-xs text-tertiary">{timeAgo(event.createdAt)}</span>
    </div>
  )

  const classes = cx(
    'px-4 py-2 text-sm',
    link && 'cursor-pointer transition-colors hover:bg-secondary',
    className,
  )

  if (link) {
    return (
      <Link href={link} className={cx(classes, 'block no-underline text-inherit')}>
        {inner}
      </Link>
    )
  }

  return <div className={classes}>{inner}</div>
}
