'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRealtimeStatus } from '@/components/RealtimeProvider'
import type { TaskRow, TaskStatus, AgentRow, NodeRow, DepartmentRow } from '@/types/supabase'
import ReactMarkdown from 'react-markdown'
import { formatDistanceToNow } from 'date-fns'

// ── Constants ───────────────────────────────────────────────────────────────

const TASK_TYPES = ['general', 'code-review', 'deploy', 'research', 'build', 'test'] as const

const STATUS_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'pending',     label: 'Pending',     color: '#eab308' },
  { status: 'claimed',     label: 'Claimed',     color: '#3b82f6' },
  { status: 'in_progress', label: 'In Progress', color: '#8b5cf6' },
  { status: 'completed',   label: 'Done',        color: '#22c55e' },
  { status: 'failed',      label: 'Failed',      color: '#ef4444' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

function agentName(agentId: string | null, agents: AgentRow[]): string {
  if (!agentId) return '—'
  const a = agents.find((ag) => ag.agent_id === agentId)
  return a ? `${a.emoji} ${a.name}` : agentId.slice(0, 8) + '…'
}

function agentById(agentId: string | null, agents: AgentRow[]): AgentRow | undefined {
  if (!agentId) return undefined
  return agents.find((ag) => ag.agent_id === agentId)
}

// ── TaskDetailPanel ───────────────────────────────────────────────────────────

interface TaskDetailPanelProps {
  taskId: string | null
  agents: AgentRow[]
  onClose: () => void
}

function TaskDetailPanel({ taskId, agents, onClose }: TaskDetailPanelProps) {
  const [task, setTask] = useState<TaskRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchTask = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${id}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || `HTTP ${res.status}`)
        return
      }
      const data: TaskRow = await res.json()
      setTask(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (taskId) {
      fetchTask(taskId)
    } else {
      setTask(null)
      setError(null)
    }
  }, [taskId, fetchTask])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleAddComment = async () => {
    if (!task || !commentText.trim()) return
    setAddingComment(true)
    setCommentError(null)
    try {
      const res = await fetch(`/api/tasks/${task.task_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentText.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      // Re-fetch to get fresh state with new comment
      await fetchTask(task.task_id)
      setCommentText('')
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to add comment')
    } finally {
      setAddingComment(false)
    }
  }

  const visible = taskId !== null
  const statusColor = task ? (STATUS_COLUMNS.find((c) => c.status === task.status)?.color ?? '#6b7280') : '#6b7280'
  const targetAgent = task ? agentById(task.target_agent_id, agents) : undefined
  const sourceAgent = task ? agentById(task.source_agent_id, agents) : undefined

  // Build status timeline events
  const timelineEvents = task ? [
    { label: 'Created', ts: task.created_at, color: '#6b7280' },
    task.claimed_at ? { label: 'Claimed', ts: task.claimed_at, color: '#3b82f6' } : null,
    task.started_at ? { label: 'Started', ts: task.started_at, color: '#8b5cf6' } : null,
    task.completed_at ? {
      label: task.status === 'failed' ? 'Failed' : 'Completed',
      ts: task.completed_at,
      color: task.status === 'failed' ? '#ef4444' : '#22c55e',
    } : null,
  ].filter(Boolean) as { label: string; ts: string; color: string }[] : []

  return (
    <>
      {/* Backdrop */}
      {visible && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 49,
            background: 'rgba(0,0,0,0.3)',
          }}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100vh',
          width: '480px',
          maxWidth: '100vw',
          background: 'var(--card, #1a1a2e)',
          borderLeft: '1px solid var(--border, rgba(255,255,255,0.12))',
          zIndex: 50,
          overflowY: 'auto',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {loading && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary, rgba(255,255,255,0.5))' }}>
            Loading…
          </div>
        )}

        {error && (
          <div style={{ padding: '16px', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {!loading && !error && task && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #e5e7eb)', lineHeight: 1.3 }}>
                  {task.title}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {/* Status badge */}
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}>
                    {task.status}
                  </span>
                  {/* Type badge */}
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary, rgba(255,255,255,0.6))' }}>
                    {task.type}
                  </span>
                  {/* Priority badge */}
                  {task.priority > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
                      P{task.priority}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, rgba(255,255,255,0.5))', fontSize: '20px', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Metadata row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--text-secondary, rgba(255,255,255,0.5))' }}>
              {sourceAgent && (
                <span>From: <span style={{ color: 'var(--text-primary, #e5e7eb)' }}>{sourceAgent.emoji} {sourceAgent.name}</span></span>
              )}
              {targetAgent && (
                <span>
                  To:{' '}
                  <a
                    href={`/agents/${targetAgent.agent_id}`}
                    style={{ color: '#8b5cf6', textDecoration: 'none', fontWeight: 600 }}
                  >
                    {targetAgent.emoji} {targetAgent.name}
                  </a>
                </span>
              )}
              <span>Created {relativeTime(task.created_at)}</span>
              {task.due_date && (
                <span style={{ color: new Date(task.due_date) < new Date() ? '#ef4444' : 'var(--text-secondary, rgba(255,255,255,0.5))' }}>
                  Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                </span>
              )}
            </div>

            {/* Required Skills */}
            {task.required_skills.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, rgba(255,255,255,0.5))', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Required Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {task.required_skills.map((skill) => (
                    <span
                      key={skill}
                      style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Labels */}
            {task.labels.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, rgba(255,255,255,0.5))', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Labels
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {task.labels.map((label) => (
                    <span
                      key={label}
                      style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary, rgba(255,255,255,0.6))', border: '1px solid var(--border, rgba(255,255,255,0.12))' }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, rgba(255,255,255,0.5))', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Description
              </div>
              {task.description ? (
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-primary, #e5e7eb)',
                    lineHeight: 1.6,
                    background: 'rgba(0,0,0,0.15)',
                    borderRadius: '6px',
                    padding: '12px',
                  }}
                  className="markdown-body"
                >
                  <ReactMarkdown>{task.description}</ReactMarkdown>
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary, rgba(255,255,255,0.4))', fontStyle: 'italic', margin: 0 }}>
                  No description.
                </p>
              )}
            </div>

            {/* Status Timeline */}
            {timelineEvents.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, rgba(255,255,255,0.5))', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Timeline
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {timelineEvents.map((ev, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
                      <span style={{ color: ev.color, fontWeight: 600, minWidth: '70px' }}>{ev.label}</span>
                      <span style={{ color: 'var(--text-secondary, rgba(255,255,255,0.5))' }}>{relativeTime(ev.ts)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, rgba(255,255,255,0.5))', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Comments {task.comments.length > 0 && `(${task.comments.length})`}
              </div>

              {task.comments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                  {task.comments.map((comment, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'rgba(0,0,0,0.15)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary, #e5e7eb)' }}>{comment.author}</span>
                        <span style={{ color: 'var(--text-secondary, rgba(255,255,255,0.4))' }}>{relativeTime(comment.created_at)}</span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary, rgba(255,255,255,0.7))', lineHeight: 1.5 }}>{comment.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary, rgba(255,255,255,0.4))', fontStyle: 'italic', margin: '0 0 10px 0' }}>
                  No comments yet.
                </p>
              )}

              {/* Add comment */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment() }}
                  placeholder="Add a comment…"
                  style={{
                    flex: 1,
                    background: 'var(--card, rgba(255,255,255,0.04))',
                    border: '1px solid var(--border, rgba(255,255,255,0.12))',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: 'var(--text-primary, #e5e7eb)',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={addingComment || !commentText.trim()}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: addingComment ? 'rgba(139,92,246,0.4)' : '#8b5cf6',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '12px',
                    border: 'none',
                    cursor: addingComment || !commentText.trim() ? 'not-allowed' : 'pointer',
                    opacity: addingComment || !commentText.trim() ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {addingComment ? '…' : 'Add'}
                </button>
              </div>
              {commentError && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#ef4444' }}>{commentError}</div>
              )}
            </div>

            {/* Payload / Result collapsible */}
            <PayloadResult task={task} />
          </div>
        )}
      </div>
    </>
  )
}

function PayloadResult({ task }: { task: TaskRow }) {
  const [open, setOpen] = useState(false)
  if (!task.payload && !task.result) return null
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary, rgba(255,255,255,0.5))',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: 0,
        }}
      >
        <span>{open ? '▾' : '▸'}</span> Payload / Result
      </button>
      {open && (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, rgba(255,255,255,0.5))', marginBottom: '4px' }}>Payload</div>
            <pre style={{ fontSize: '11px', color: 'var(--text-primary, #e5e7eb)', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', padding: '8px', overflow: 'auto', maxHeight: '160px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(task.payload, null, 2)}
            </pre>
          </div>
          {task.result && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, rgba(255,255,255,0.5))', marginBottom: '4px' }}>Result</div>
              <pre style={{ fontSize: '11px', color: '#22c55e', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', padding: '8px', overflow: 'auto', maxHeight: '160px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(task.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── TaskCard ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: TaskRow
  agents: AgentRow[]
  statusColor: string
  onSelect: (taskId: string) => void
}

function TaskCard({ task, agents, statusColor, onSelect }: TaskCardProps) {
  const isDueSoon = task.due_date ? new Date(task.due_date) < new Date() : false
  const isAgentCreated = task.source_agent_id !== null

  return (
    <div
      onClick={() => onSelect(task.task_id)}
      style={{
        background: 'var(--card, rgba(255,255,255,0.04))',
        borderRadius: '8px',
        borderLeft: `3px solid ${statusColor}`,
        padding: '12px',
        marginBottom: '8px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary, #e5e7eb)', lineHeight: 1.3, wordBreak: 'break-word' }}>
          {task.title}
        </span>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {/* Type badge */}
          <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary, rgba(255,255,255,0.6))', whiteSpace: 'nowrap' }}>
            {task.type}
          </span>
          {/* Priority badge */}
          {task.priority > 0 && (
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(234,179,8,0.15)', color: '#eab308', whiteSpace: 'nowrap' }}>
              P{task.priority}
            </span>
          )}
        </div>
      </div>

      {/* Required skills chips */}
      {task.required_skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
          {task.required_skills.slice(0, 3).map((skill) => (
            <span key={skill} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
              {skill}
            </span>
          ))}
          {task.required_skills.length > 3 && (
            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary, rgba(255,255,255,0.4))' }}>
              +{task.required_skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Agent row + source indicator */}
      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Source badge */}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: '999px',
            background: isAgentCreated ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)',
            color: isAgentCreated ? '#60a5fa' : '#4ade80',
            border: isAgentCreated ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(34,197,94,0.3)',
          }}
        >
          {isAgentCreated ? 'Agent' : 'Human'}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary, rgba(255,255,255,0.5))' }}>
          To: <span style={{ color: 'var(--text-primary, #e5e7eb)' }}>{agentName(task.target_agent_id, agents)}</span>
        </span>
      </div>

      {/* Timestamps + due date */}
      <div style={{ marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary, rgba(255,255,255,0.4))' }}>
          {relativeTime(task.created_at)}
        </span>
        {task.due_date && (
          <span style={{ fontSize: '11px', color: isDueSoon ? '#ef4444' : 'var(--text-secondary, rgba(255,255,255,0.4))' }}>
            Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
          </span>
        )}
        {task.comments.length > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text-secondary, rgba(255,255,255,0.4))' }}>
            {task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Failed: error message */}
      {task.status === 'failed' && task.error_message && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: '4px', padding: '4px 8px' }}>
          Error: {task.error_message}
          <span style={{ marginLeft: '8px', color: 'var(--text-secondary, rgba(255,255,255,0.4))' }}>
            ({task.retry_count}/{task.max_retries} retries)
          </span>
        </div>
      )}
    </div>
  )
}

// ── KanbanColumn ─────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  label: string
  color: string
  tasks: TaskRow[]
  agents: AgentRow[]
  onSelectTask: (taskId: string) => void
}

function KanbanColumn({ label, color, tasks, agents, onSelectTask }: KanbanColumnProps) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary, #e5e7eb)' }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '999px', background: `${color}22`, color: color, flexShrink: 0 }}>
          {tasks.length}
        </span>
      </div>

      {/* Task cards */}
      <div style={{ overflowY: 'auto', flexGrow: 1, maxHeight: 'calc(100vh - 380px)' }}>
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--text-secondary, rgba(255,255,255,0.3))', fontSize: '12px' }}>
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.task_id} task={task} agents={agents} statusColor={color} onSelect={onSelectTask} />
          ))
        )}
      </div>
    </div>
  )
}

// ── KanbanFilters ─────────────────────────────────────────────────────────────

interface KanbanFiltersProps {
  agents: AgentRow[]
  departments: DepartmentRow[]
  filterAgentId: string
  filterDeptId: string
  filterSkill: string
  filterMinPriority: number
  onAgentChange: (v: string) => void
  onDeptChange: (v: string) => void
  onSkillChange: (v: string) => void
  onPriorityChange: (v: number) => void
  onClear: () => void
  totalTasks: number
  filteredCount: number
}

function KanbanFilters({
  agents,
  departments,
  filterAgentId,
  filterDeptId,
  filterSkill,
  filterMinPriority,
  onAgentChange,
  onDeptChange,
  onSkillChange,
  onPriorityChange,
  onClear,
  totalTasks,
  filteredCount,
}: KanbanFiltersProps) {
  const inputStyle: React.CSSProperties = {
    background: 'var(--card, rgba(255,255,255,0.04))',
    border: '1px solid var(--border, rgba(255,255,255,0.12))',
    borderRadius: '6px',
    padding: '5px 8px',
    fontSize: '12px',
    color: 'var(--text-primary, #e5e7eb)',
    outline: 'none',
    cursor: 'pointer',
  }

  // Derive unique skills from all agents
  const allSkills = Array.from(new Set(agents.flatMap((a) => a.skills ?? []))).sort()

  const isFiltered = filterAgentId || filterDeptId || filterSkill || filterMinPriority > 0

  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.15)',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: '8px',
        padding: '10px 14px',
        marginBottom: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
      }}
    >
      {/* Agent filter */}
      <select value={filterAgentId} onChange={(e) => onAgentChange(e.target.value)} style={inputStyle}>
        <option value="">All agents</option>
        {agents.map((a) => (
          <option key={a.agent_id} value={a.agent_id}>{a.emoji} {a.name}</option>
        ))}
      </select>

      {/* Department filter */}
      <select value={filterDeptId} onChange={(e) => onDeptChange(e.target.value)} style={inputStyle}>
        <option value="">All departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>{d.icon} {d.display_name}</option>
        ))}
      </select>

      {/* Skill filter */}
      <select value={filterSkill} onChange={(e) => onSkillChange(e.target.value)} style={inputStyle}>
        <option value="">All skills</option>
        {allSkills.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Priority filter */}
      <select value={filterMinPriority} onChange={(e) => onPriorityChange(Number(e.target.value))} style={inputStyle}>
        <option value={0}>All priorities</option>
        <option value={1}>P1+</option>
        <option value={2}>P2+</option>
        <option value={3}>P3+</option>
      </select>

      {/* Clear filters */}
      {isFiltered && (
        <button
          onClick={onClear}
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '6px',
            padding: '5px 10px',
            fontSize: '12px',
            color: '#ef4444',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Clear filters
        </button>
      )}

      {/* Filtered count */}
      {isFiltered && (
        <span style={{ fontSize: '11px', color: 'var(--text-secondary, rgba(255,255,255,0.5))', marginLeft: 'auto' }}>
          Showing {filteredCount} of {totalTasks} tasks
        </span>
      )}
    </div>
  )
}

// ── TaskCreationForm ──────────────────────────────────────────────────────────

interface TaskCreationFormProps {
  agents: AgentRow[]
  nodes: NodeRow[]
  onCreated: () => void
}

function TaskCreationForm({ agents, nodes, onCreated }: TaskCreationFormProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<string>('general')
  const [targetAgentId, setTargetAgentId] = useState('')
  const [priority, setPriority] = useState(0)
  const [maxRetries, setMaxRetries] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extended fields (More options)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [description, setDescription] = useState('')
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])
  const [newSkillInput, setNewSkillInput] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [newLabelInput, setNewLabelInput] = useState('')
  const [dueDate, setDueDate] = useState('')

  // Check if the selected target agent's node is offline
  const selectedAgent = targetAgentId ? agents.find((a) => a.agent_id === targetAgentId) : null
  const selectedAgentNode = selectedAgent ? nodes.find((n) => n.node_id === selectedAgent.node_id) : null
  const isTargetNodeOffline = selectedAgentNode?.status === 'offline'

  const addTag = (value: string, list: string[], setter: (v: string[]) => void, inputSetter: (v: string) => void) => {
    const trimmed = value.trim()
    if (!trimmed || list.includes(trimmed)) return
    setter([...list, trimmed])
    inputSetter('')
  }

  const removeTag = (value: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.filter((s) => s !== value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        type,
        priority,
        max_retries: maxRetries,
      }
      if (targetAgentId) body.target_agent_id = targetAgentId
      if (description.trim()) body.description = description.trim()
      if (requiredSkills.length > 0) body.required_skills = requiredSkills
      if (labels.length > 0) body.labels = labels
      if (dueDate) body.due_date = new Date(dueDate).toISOString()

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      // Clear form
      setTitle('')
      setType('general')
      setTargetAgentId('')
      setPriority(0)
      setMaxRetries(0)
      setDescription('')
      setRequiredSkills([])
      setLabels([])
      setDueDate('')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--card, rgba(255,255,255,0.04))',
    border: '1px solid var(--border, rgba(255,255,255,0.12))',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '13px',
    color: 'var(--text-primary, #e5e7eb)',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-secondary, rgba(255,255,255,0.5))',
    marginBottom: '4px',
    display: 'block',
  }

  return (
    <div
      style={{
        background: 'var(--card, rgba(255,255,255,0.04))',
        border: '1px solid var(--border, rgba(255,255,255,0.1))',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '16px',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #e5e7eb)', marginBottom: '14px' }}>
        Create Task
      </div>

      <form onSubmit={handleSubmit}>
        {/* Top row: main fields */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 80px auto', gap: '12px', alignItems: 'end' }}
          className="task-form-grid"
        >
          {/* Title */}
          <div>
            <label style={labelStyle}>Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title…"
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Target agent */}
          <div>
            <label style={labelStyle}>Target agent</label>
            <select
              value={targetAgentId}
              onChange={(e) => setTargetAgentId(e.target.value)}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}
            >
              <option value="">(auto-route)</option>
              {agents.map((a) => (
                <option key={a.agent_id} value={a.agent_id}>
                  {a.emoji} {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Offline node warning */}
          {isTargetNodeOffline && (
            <div
              style={{
                gridColumn: '1 / -1',
                background: 'rgba(255, 214, 10, 0.10)',
                border: '1px solid #FFD60A',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                color: '#FFD60A',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '14px' }}>&#9888;</span>
              <span>This agent&apos;s node is offline. Task will be queued.</span>
            </div>
          )}

          {/* Priority */}
          <div>
            <label style={labelStyle}>Priority</label>
            <input
              type="number"
              min={0}
              max={10}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Max retries */}
          <div>
            <label style={labelStyle}>Retries</label>
            <input
              type="number"
              min={0}
              max={5}
              value={maxRetries}
              onChange={(e) => setMaxRetries(Number(e.target.value))}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Submit */}
          <div>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                background: submitting ? 'rgba(139,92,246,0.4)' : '#8b5cf6',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: submitting || !title.trim() ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                opacity: submitting || !title.trim() ? 0.6 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              {submitting ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </div>

        {/* More options toggle */}
        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            onClick={() => setShowMoreOptions((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              color: 'var(--text-secondary, rgba(255,255,255,0.5))',
              padding: '2px 0',
            }}
          >
            {showMoreOptions ? '▾ Fewer options' : '▸ More options'}
          </button>
        </div>

        {/* Expandable section */}
        {showMoreOptions && (
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="task-more-options-grid">
            {/* Description */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task description (supports markdown)…"
                rows={3}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {/* Required Skills */}
            <div>
              <label style={labelStyle}>Required Skills</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                {requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    onClick={() => removeTag(skill, requiredSkills, setRequiredSkills)}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'rgba(139,92,246,0.15)',
                      color: '#a78bfa',
                      border: '1px solid rgba(139,92,246,0.3)',
                      cursor: 'pointer',
                    }}
                  >
                    {skill} ×
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(newSkillInput, requiredSkills, setRequiredSkills, setNewSkillInput) } }}
                placeholder="Add skill (Enter)…"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', fontSize: '12px' }}
              />
            </div>

            {/* Labels */}
            <div>
              <label style={labelStyle}>Labels</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                {labels.map((label) => (
                  <span
                    key={label}
                    onClick={() => removeTag(label, labels, setLabels)}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,0.08)',
                      color: 'var(--text-secondary, rgba(255,255,255,0.6))',
                      border: '1px solid var(--border, rgba(255,255,255,0.12))',
                      cursor: 'pointer',
                    }}
                  >
                    {label} ×
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={newLabelInput}
                onChange={(e) => setNewLabelInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(newLabelInput, labels, setLabels, setNewLabelInput) } }}
                placeholder="Add label (Enter)…"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', fontSize: '12px' }}
              />
            </div>

            {/* Due Date */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Due Date</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: '4px', padding: '6px 10px' }}>
            {error}
          </div>
        )}
      </form>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { tasks, agents, nodes, departments, tasksLoading } = useRealtimeStatus()
  const [createdCount, setCreatedCount] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Filter state
  const [filterAgentId, setFilterAgentId] = useState<string>('')
  const [filterDeptId, setFilterDeptId] = useState<string>('')
  const [filterSkill, setFilterSkill] = useState<string>('')
  const [filterMinPriority, setFilterMinPriority] = useState<number>(0)

  const clearFilters = useCallback(() => {
    setFilterAgentId('')
    setFilterDeptId('')
    setFilterSkill('')
    setFilterMinPriority(0)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedTaskId(null)
  }, [])

  // Apply filters
  const filteredTasks = tasks.filter((task) => {
    if (filterAgentId && task.target_agent_id !== filterAgentId) return false
    if (filterDeptId) {
      const agent = agents.find((a) => a.agent_id === task.target_agent_id)
      if (!agent || agent.department_id !== filterDeptId) return false
    }
    if (filterSkill && !(task.required_skills ?? []).includes(filterSkill)) return false
    if (task.priority < filterMinPriority) return false
    return true
  })

  // Group filtered tasks by status, sorted by priority DESC then created_at DESC
  const tasksByStatus = STATUS_COLUMNS.reduce<Record<TaskStatus, TaskRow[]>>(
    (acc, col) => {
      acc[col.status] = filteredTasks
        .filter((t) => t.status === col.status)
        .sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
      return acc
    },
    {} as Record<TaskStatus, TaskRow[]>
  )

  // FLOW-05: Emit custom event on task completion for Phase 13 Phaser animation hook
  useEffect(() => {
    // Track previous task statuses to detect transitions
    const prevStatuses = new Map<string, string>()
    tasks.forEach((t) => prevStatuses.set(t.task_id, t.status))
    // Return cleanup noop — actual change detection happens in useRealtimeTasks UPDATE handler
    // TODO (Phase 13): Move this to useRealtimeTasks to access payload.old for precise old vs new comparison
  }, [])

  return (
    <div style={{ maxWidth: '1600px' }}>
      {/* Page header */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: 'var(--text-primary, #e5e7eb)' }}>
          Tasks
        </h1>
        {!tasksLoading && (
          <span style={{ fontSize: '13px', padding: '3px 10px', background: 'var(--border, rgba(255,255,255,0.08))', borderRadius: '999px', color: 'var(--text-secondary, rgba(255,255,255,0.5))' }}>
            {tasks.length} total
          </span>
        )}
      </div>

      {/* Task creation form */}
      <TaskCreationForm
        agents={agents}
        nodes={nodes}
        onCreated={() => setCreatedCount((n) => n + 1)}
        key={createdCount}
      />

      {/* Filter bar */}
      <KanbanFilters
        agents={agents}
        departments={departments}
        filterAgentId={filterAgentId}
        filterDeptId={filterDeptId}
        filterSkill={filterSkill}
        filterMinPriority={filterMinPriority}
        onAgentChange={setFilterAgentId}
        onDeptChange={setFilterDeptId}
        onSkillChange={setFilterSkill}
        onPriorityChange={setFilterMinPriority}
        onClear={clearFilters}
        totalTasks={tasks.length}
        filteredCount={filteredTasks.length}
      />

      {/* Kanban board */}
      {tasksLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          {STATUS_COLUMNS.map((col) => (
            <div
              key={col.status}
              style={{
                height: '300px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border, rgba(255,255,255,0.08))',
                borderRadius: '10px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      ) : (
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}
          className="kanban-grid"
        >
          {STATUS_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              label={col.label}
              color={col.color}
              tasks={tasksByStatus[col.status]}
              agents={agents}
              onSelectTask={setSelectedTaskId}
            />
          ))}
        </div>
      )}

      {/* Task detail panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        agents={agents}
        onClose={handleClosePanel}
      />

      {/* Responsive style */}
      <style>{`
        @media (max-width: 1200px) {
          .kanban-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 768px) {
          .kanban-grid {
            grid-template-columns: 1fr !important;
          }
          .task-form-grid {
            grid-template-columns: 1fr !important;
          }
          .task-more-options-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .markdown-body p { margin: 0 0 8px 0; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body code { background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px; font-size: 0.9em; }
        .markdown-body pre { background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; overflow: auto; }
        .markdown-body ul, .markdown-body ol { padding-left: 20px; margin: 4px 0; }
      `}</style>
    </div>
  )
}
