'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { CardActivityRow, CardCommentRow, WorkflowStateRow } from '@/types/workflow'
import { Send } from 'lucide-react'
import { MentionInput } from '@/components/MentionInput'
import { renderMentionText } from '@/lib/mention-utils'

interface CardActivityTimelineProps {
  cardId: string
  comments: CardCommentRow[]
  workflowId?: string
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

function renderActivityText(
  entry: CardActivityRow,
  stateMap: Map<string, string>,
): string {
  switch (entry.action) {
    case 'created':
      return `${entry.actor} created this card`
    case 'state_change': {
      // old_value / new_value are expected to be { state_id: "uuid" } objects
      const oldId =
        entry.old_value && typeof entry.old_value === 'object'
          ? (entry.old_value as Record<string, string>).state_id
          : String(entry.old_value ?? '')
      const newId =
        entry.new_value && typeof entry.new_value === 'object'
          ? (entry.new_value as Record<string, string>).state_id
          : String(entry.new_value ?? '')
      const oldName = stateMap.get(oldId) ?? oldId ?? 'unknown'
      const newName = stateMap.get(newId) ?? newId ?? 'unknown'
      return `${entry.actor} changed state from "${oldName}" to "${newName}"`
    }
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

export function CardActivityTimeline({ cardId, comments, workflowId }: CardActivityTimelineProps) {
  const [activities, setActivities] = useState<CardActivityRow[]>([])
  const [loadingActivity, setLoadingActivity] = useState(true)
  const [localComments, setLocalComments] = useState<CardCommentRow[]>(comments)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [stateMap, setStateMap] = useState<Map<string, string>>(new Map())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Sync when parent passes new comments
  useEffect(() => {
    setLocalComments(comments)
  }, [comments])

  // Fetch workflow states for state name resolution
  useEffect(() => {
    if (!workflowId) return
    fetch(`/api/workflows/${workflowId}/states`)
      .then((r) => (r.ok ? r.json() : []))
      .then((states: WorkflowStateRow[]) => {
        const map = new Map<string, string>()
        states.forEach((s) => map.set(s.state_id, s.name))
        setStateMap(map)
      })
      .catch(() => {})
  }, [workflowId])

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
            setActivities([])
          } else {
            console.error('[CardActivityTimeline] fetch error:', error)
            setActivities([])
          }
        } else {
          setActivities((data as CardActivityRow[]) ?? [])
        }
      } catch (err) {
        console.error('[CardActivityTimeline] unexpected error:', err)
        setActivities([])
      } finally {
        setLoadingActivity(false)
      }
    }

    fetchActivity()
  }, [cardId])

  // Realtime subscriptions for card_comments and card_activity
  // Use callbackRef pattern to avoid re-subscribing on render cycles
  const handleNewCommentRef = useRef<(comment: CardCommentRow) => void>(() => {})
  const handleNewActivityRef = useRef<(activity: CardActivityRow) => void>(() => {})

  handleNewCommentRef.current = useCallback((newComment: CardCommentRow) => {
    setLocalComments((prev) => {
      if (prev.some((c) => c.comment_id === newComment.comment_id)) return prev
      return [...prev, newComment]
    })
  }, [])

  handleNewActivityRef.current = useCallback((newActivity: CardActivityRow) => {
    setActivities((prev) => {
      if (prev.some((a) => a.activity_id === newActivity.activity_id)) return prev
      return [...prev, newActivity]
    })
  }, [])

  useEffect(() => {
    if (!cardId) return

    const supabase = createBrowserClient()
    const channel = supabase
      .channel(`timeline-${cardId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'card_comments',
          filter: `card_id=eq.${cardId}`,
        },
        (payload) => {
          handleNewCommentRef.current(payload.new as CardCommentRow)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'card_activity',
          filter: `card_id=eq.${cardId}`,
        },
        (payload) => {
          handleNewActivityRef.current(payload.new as CardActivityRow)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [cardId])

  const submitComment = async () => {
    const text = commentText.trim()
    if (!text || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/cards/${cardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'user', text }),
      })
      if (res.ok) {
        const newComment = (await res.json()) as CardCommentRow
        setLocalComments((prev) => {
          // Realtime may already have added it — avoid duplicate
          if (prev.some((c) => c.comment_id === newComment.comment_id)) return prev
          return [...prev, newComment]
        })
        setCommentText('')
      }
    } catch (err) {
      console.error('[CardActivityTimeline] submit comment error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Merge activities and comments into a single chronological list
  const entries: TimelineEntry[] = [
    ...activities.map((a) => ({ kind: 'activity' as const, data: a })),
    ...localComments.map((c) => ({ kind: 'comment' as const, data: c })),
  ].sort((a, b) => {
    const aTime = new Date(a.data.created_at).getTime()
    const bTime = new Date(b.data.created_at).getTime()
    return aTime - bTime
  })

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [entries.length])

  const commentInputBox = (
    <div style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <MentionInput
            value={commentText}
            onChange={setCommentText}
            onSubmit={submitComment}
            placeholder="Write a comment... Use @ to mention"
            disabled={submitting}
            rows={2}
          />
        </div>
        <button
          onClick={submitComment}
          disabled={!commentText.trim() || submitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            cursor: !commentText.trim() || submitting ? 'not-allowed' : 'pointer',
            background:
              commentText.trim() && !submitting
                ? 'var(--brand-600)'
                : 'var(--bg-secondary)',
            color:
              commentText.trim() && !submitting ? '#fff' : 'var(--text-quaternary-500)',
            transition: 'background 0.15s, color 0.15s',
            flexShrink: 0,
          }}
          title="Send comment (Enter)"
        >
          <Send size={14} />
        </button>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontSize: '10px',
          color: "var(--text-quaternary-500)",
          marginTop: '4px',
        }}
      >
        Press Enter to send, @ to mention
      </div>
    </div>
  )

  if (loadingActivity) {
    return (
      <div>
        <p
          style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '12px',
            color: "var(--text-quaternary-500)",
            margin: 0,
            padding: '8px 0',
          }}
        >
          Loading activity...
        </p>
        {commentInputBox}
      </div>
    )
  }

  return (
    <div>
      {entries.length === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '12px',
            color: "var(--text-quaternary-500)",
            margin: 0,
            padding: '8px 0',
          }}
        >
          No activity yet
        </p>
      ) : (
        <div
          ref={scrollRef}
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
              background: 'var(--border-primary)',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '20px' }}>
            {entries.map((entry, idx) => {
              const isComment = entry.kind === 'comment'
              const dotColor = isComment ? 'var(--brand-600)' : 'var(--text-quaternary, #9ca3af)'

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
                        border: '1px solid var(--bg-tertiary)',
                      }}
                    />
                    <div>
                      <span
                        style={{
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          fontSize: '12px',
                          color: "var(--text-tertiary-600)",
                          fontWeight: 500,
                        }}
                      >
                        {comment.author}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          fontSize: '12px',
                          color: "var(--text-quaternary-500)",
                        }}
                      >
                        {': '}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          fontSize: '12px',
                          color: "var(--text-primary-900)",
                        }}
                      >
                        {renderMentionText(comment.text)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        fontSize: '11px',
                        color: "var(--text-quaternary-500)",
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
                        border: '1px solid var(--bg-tertiary)',
                      }}
                    />
                    <div
                      style={{
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        fontSize: '12px',
                        color: "var(--text-tertiary-600)",
                      }}
                    >
                      {renderActivityText(activity, stateMap)}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        fontSize: '11px',
                        color: "var(--text-quaternary-500)",
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
      )}

      {commentInputBox}
    </div>
  )
}
