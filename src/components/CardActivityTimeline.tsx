'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { CardActivityRow, CardCommentRow } from '@/types/workflow'

interface CardActivityTimelineProps {
  cardId: string
  comments: CardCommentRow[]
}

type TimelineEntry =
  | { kind: 'activity'; data: CardActivityRow }
  | { kind: 'comment'; data: CardCommentRow }

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`
  if (diffDay === 1) return 'yesterday'
  if (diffDay < 7) return `${diffDay} days ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function renderActivityText(entry: CardActivityRow): string {
  switch (entry.action) {
    case 'created':
      return `${entry.actor} created this card`
    case 'state_change':
      return `${entry.actor} changed state from "${entry.old_value}" to "${entry.new_value}"`
    case 'field_update':
      return `${entry.actor} updated a field`
    case 'assignment':
      return `${entry.actor} changed assignee`
    case 'priority_change':
      return `${entry.actor} changed priority from "${entry.old_value}" to "${entry.new_value}"`
    case 'label_change':
      return `${entry.actor} updated labels`
    case 'parent_change':
      return `${entry.actor} changed parent card`
    case 'attachment_add':
      return `${entry.actor} added an attachment`
    case 'attachment_remove':
      return `${entry.actor} removed an attachment`
    default:
      return `${entry.actor} ${entry.action}`
  }
}

export function CardActivityTimeline({ cardId, comments }: CardActivityTimelineProps) {
  const [activities, setActivities] = useState<CardActivityRow[]>([])
  const [loadingActivity, setLoadingActivity] = useState(true)

  useEffect(() => {
    async function fetchActivity() {
      setLoadingActivity(true)
      try {
        const supabase = createBrowserClient()
        const { data, error } = await supabase
          .from('card_activity')
          .select('*')
          .eq('card_id', cardId)
          .order('created_at', { ascending: true })

        if (error) {
          // Gracefully handle 42P01 (table doesn't exist) or any other error
          if (
            error.code === '42P01' ||
            error.message?.includes('relation') ||
            error.message?.includes('does not exist')
          ) {
            // Table missing — show empty state
            setActivities([])
          } else {
            console.error('[CardActivityTimeline] fetch error:', error)
            setActivities([])
          }
        } else {
          setActivities((data as CardActivityRow[]) ?? [])
        }
      } catch (err) {
        // Network or unexpected error — show empty state gracefully
        console.error('[CardActivityTimeline] unexpected error:', err)
        setActivities([])
      } finally {
        setLoadingActivity(false)
      }
    }

    fetchActivity()
  }, [cardId])

  // Merge activities and comments into a single chronological list
  const entries: TimelineEntry[] = [
    ...activities.map((a) => ({ kind: 'activity' as const, data: a })),
    ...comments.map((c) => ({ kind: 'comment' as const, data: c })),
  ].sort((a, b) => {
    const aTime = new Date(a.data.created_at).getTime()
    const bTime = new Date(b.data.created_at).getTime()
    return aTime - bTime
  })

  if (loadingActivity) {
    return (
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          margin: 0,
          padding: '8px 0',
        }}
      >
        Loading activity...
      </p>
    )
  }

  if (entries.length === 0) {
    return (
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          margin: 0,
          padding: '8px 0',
        }}
      >
        No activity yet
      </p>
    )
  }

  return (
    <div
      style={{
        maxHeight: '280px',
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {/* Vertical connector line */}
      <div
        style={{
          position: 'absolute',
          left: '6px',
          top: '8px',
          bottom: '8px',
          width: '1px',
          background: 'var(--border)',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '20px' }}>
        {entries.map((entry, idx) => {
          const isComment = entry.kind === 'comment'
          const dotColor = isComment ? 'var(--accent, #6366f1)' : 'var(--text-muted, #9ca3af)'

          if (isComment) {
            const comment = entry.data as CardCommentRow
            return (
              <div key={`comment-${comment.comment_id}-${idx}`} style={{ position: 'relative' }}>
                {/* Dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-17px',
                    top: '4px',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: dotColor,
                    border: '1px solid var(--surface-elevated, var(--surface))',
                  }}
                />
                <div>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      fontWeight: 500,
                    }}
                  >
                    {comment.author}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {': '}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {comment.text}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                  }}
                >
                  {formatRelativeTime(comment.created_at)}
                </div>
              </div>
            )
          } else {
            const activity = entry.data as CardActivityRow
            return (
              <div key={`activity-${activity.activity_id}-${idx}`} style={{ position: 'relative' }}>
                {/* Dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-17px',
                    top: '4px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: dotColor,
                    border: '1px solid var(--surface-elevated, var(--surface))',
                  }}
                />
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {renderActivityText(activity)}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                  }}
                >
                  {formatRelativeTime(activity.created_at)}
                </div>
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}
