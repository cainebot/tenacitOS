'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, AlertTriangle, Clock, MessageCircle } from 'lucide-react'
import { StatusDot } from '@/components/atoms/StatusDot'
import { PriorityBadge } from '@/components/atoms/PriorityBadge'
import { ChatPanel } from '@/components/organisms/ChatPanel'
import { ContextBreadcrumbs } from '@/components/molecules/ContextBreadcrumbs'
import type { AgentListItem } from '@/contexts/AgentFilterContext'
import type { CardRow, CursorPage } from '@/types/workflow'

// ---- Helpers ----

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}

function statusLabel(status: string): string {
  switch (status) {
    case 'working':
    case 'thinking':
      return 'WORKING'
    case 'executing_tool':
      return 'EXECUTING'
    case 'paused':
      return 'PAUSED'
    case 'idle':
    case 'queued':
      return 'IDLE'
    case 'offline':
      return 'OFFLINE'
    case 'error':
      return 'ERROR'
    default:
      return 'OFFLINE'
  }
}

function statusPillColors(status: string): { bg: string; color: string } {
  switch (status) {
    case 'working':
    case 'thinking':
    case 'executing_tool':
      return { bg: 'rgba(50, 215, 75, 0.15)', color: 'var(--positive, #32D74B)' }
    case 'paused':
      return { bg: 'rgba(255, 214, 10, 0.15)', color: 'var(--warning, #FFD60A)' }
    case 'idle':
    case 'queued':
      return { bg: 'rgba(10, 132, 255, 0.15)', color: 'var(--info, #0A84FF)' }
    default:
      return { bg: 'rgba(255, 69, 58, 0.15)', color: 'var(--negative, #FF453A)' }
  }
}

function badgeColors(badge?: string): { bg: string; color: string } {
  switch (badge) {
    case 'LEAD':
      return { bg: 'rgba(255,59,48,0.12)', color: '#FF3B30' }
    case 'SPC':
      return { bg: 'rgba(249,115,22,0.12)', color: '#f97316' }
    case 'INT':
      return { bg: 'rgba(10,132,255,0.12)', color: '#0A84FF' }
    default:
      return { bg: 'rgba(82,82,82,0.12)', color: 'var(--text-muted)' }
  }
}

function roleLabel(role?: string): string {
  switch (role) {
    case 'lead':
      return 'Scrum Master'
    case 'specialist':
      return 'Specialist'
    case 'intern':
      return 'Intern'
    default:
      return role ?? 'Agent'
  }
}

// ---- Types ----

interface ActivityItem {
  action: string
  created_at: string
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  color: 'var(--text-muted)',
  marginBottom: '8px',
}

interface AgentSidePanelProps {
  agent: AgentListItem
  boardId: string
  onClose: () => void
}

type TabId = 'details' | 'timeline' | 'messages'

export function AgentSidePanel({ agent, boardId, onClose }: AgentSidePanelProps) {
  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    right: 0,
    top: 0,
    bottom: 0,
    width: '380px',
    background: 'var(--surface-elevated, #242424)',
    borderLeft: '1px solid var(--border)',
    zIndex: 49,
    transform: 'translateX(0)',
    transition: 'transform 0.2s ease-out',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  }

  const [activeTab, setActiveTab] = useState<TabId>('details')

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Description editing
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState(agent.about ?? '')
  const [descSaving, setDescSaving] = useState(false)
  const [descError, setDescError] = useState<string | null>(null)

  useEffect(() => {
    setDescDraft(agent.about ?? '')
    setIsEditingDesc(false)
    setDescError(null)
  }, [agent.agent_id, agent.about])

  const handleDescSave = useCallback(async () => {
    setDescSaving(true)
    try {
      const res = await fetch(`/api/agents/${agent.agent_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ about: descDraft }),
      })
      if (!res.ok) throw new Error('Save failed')
      setIsEditingDesc(false)
      setDescError(null)
    } catch {
      setDescError('Could not save. Try again.')
      setTimeout(() => setDescError(null), 3000)
    } finally {
      setDescSaving(false)
    }
  }, [agent.agent_id, descDraft])

  // Assigned Cards — kept for card list rendering
  const [assignedCards, setAssignedCards] = useState<CardRow[]>([])
  const [cardsLoading, setCardsLoading] = useState(true)

  useEffect(() => {
    setCardsLoading(true)
    fetch(`/api/cards?assigned_agent_id=${agent.agent_id}&board_id=${boardId}`)
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((page: CursorPage<CardRow>) => setAssignedCards(page.data ?? []))
      .catch(() => setAssignedCards([]))
      .finally(() => setCardsLoading(false))
  }, [agent.agent_id, boardId])

  // Recent Activity
  const [activities, setActivities] = useState<ActivityItem[]>([])

  useEffect(() => {
    fetch(`/api/activities?actor=${agent.agent_id}&limit=5`)
      .then((r) => r.ok ? r.json() : [])
      .then((items: ActivityItem[]) => setActivities(Array.isArray(items) ? items.slice(0, 5) : []))
      .catch(() => setActivities([]))
  }, [agent.agent_id])

  // Unread message count for Messages tab badge
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch(`/api/agents/${agent.agent_id}/messages/topics`)
      .then((r) => r.ok ? r.json() : { topics: [] })
      .then((json: { topics: Array<{ name: string; unread_count: number }> }) => {
        const total = json.topics.reduce((sum, t) => sum + t.unread_count, 0)
        setUnreadCount(total)
      })
      .catch(() => setUnreadCount(0))
  }, [agent.agent_id, activeTab])

  // Attention count from dedicated endpoint
  const [attentionInfo, setAttentionInfo] = useState<{ total: number; failed_tasks: number; unread_messages: number; attention_cards: number }>({ total: 0, failed_tasks: 0, unread_messages: 0, attention_cards: 0 })

  useEffect(() => {
    fetch(`/api/agents/${agent.agent_id}/attention`)
      .then((r) => r.ok ? r.json() : { total: 0, failed_tasks: 0, unread_messages: 0, attention_cards: 0 })
      .then((data) => setAttentionInfo(data))
      .catch(() => setAttentionInfo({ total: 0, failed_tasks: 0, unread_messages: 0, attention_cards: 0 }))
  }, [agent.agent_id])

  // System events for context breadcrumbs
  const [systemEvents, setSystemEvents] = useState<Array<{ description: string; created_at: string }>>([])

  useEffect(() => {
    fetch(`/api/activities?actor=${agent.agent_id}&type=system_event&limit=10`)
      .then((r) => r.ok ? r.json() : [])
      .then((items: Array<{ action: string; created_at: string }>) => {
        setSystemEvents(
          Array.isArray(items)
            ? items.map((item) => ({ description: item.action, created_at: item.created_at }))
            : []
        )
      })
      .catch(() => setSystemEvents([]))
  }, [agent.agent_id])

  const statusPill = statusPillColors(agent.status)
  const agentBadge = badgeColors(agent.badge)
  const attentionCount = attentionInfo.total

  // Suppress unused variable warning — assignedCards kept for potential future card list rendering
  void cardsLoading
  void assignedCards

  return (
    <div style={panelStyle} role="complementary" aria-label={`Agent profile: ${agent.name}`}>

      {/* AGENT PROFILE header bar */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-heading)',
          }}
        >
          AGENT PROFILE
        </span>
        <button
          onClick={onClose}
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            borderRadius: '4px',
          }}
          aria-label="Close panel"
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <X size={16} />
        </button>
      </div>

      {/* Profile: horizontal layout — avatar left, info right */}
      <div
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Avatar */}
        <span
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--surface)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontFamily: 'var(--font-body)',
            flexShrink: 0,
          }}
        >
          {agent.emoji || agent.name.charAt(0).toUpperCase()}
        </span>

        {/* Info column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + attention count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', lineHeight: 1.2 }}>
              {agent.name}
            </div>
            {attentionCount > 0 && (
              <span
                title={`${attentionInfo.unread_messages} unread, ${attentionInfo.failed_tasks} failed tasks, ${attentionInfo.attention_cards} attention cards`}
                style={{
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '9999px',
                  background: 'var(--negative, #FF453A)',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-body)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}
              >
                {attentionCount > 9 ? '9+' : attentionCount}
              </span>
            )}
          </div>

          {/* Role */}
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', marginTop: '2px' }}>
            {roleLabel(agent.role)}
          </div>

          {/* Badge + Status pill row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            {agent.badge && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-body)',
                  textTransform: 'uppercase',
                  background: agentBadge.bg,
                  color: agentBadge.color,
                  borderRadius: '9999px',
                  padding: '3px 10px',
                }}
              >
                {agent.badge === 'LEAD' ? 'Lead' : agent.badge === 'SPC' ? 'Specialist' : agent.badge === 'INT' ? 'Intern' : agent.badge}
              </span>
            )}

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
                background: statusPill.bg,
                color: statusPill.color,
                borderRadius: '9999px',
                padding: '3px 12px',
              }}
            >
              <StatusDot status={agent.status} variant="agent" />
              {statusLabel(agent.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs: Details | Timeline | Messages — right after profile */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', flexShrink: 0 }}>
        {([
          { id: 'details' as TabId, label: 'Details', icon: AlertTriangle },
          { id: 'timeline' as TabId, label: 'Timeline', icon: Clock },
          { id: 'messages' as TabId, label: 'Messages', icon: MessageCircle },
        ]).map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '10px 4px',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: isActive ? 600 : 500,
                fontFamily: 'var(--font-body)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                transition: 'color 0.1s',
              }}
            >
              <Icon size={13} />
              {tab.label}
              {tab.id === 'messages' && unreadCount > 0 && (
                <span style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '4px',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Details tab: STATUS REASON + ABOUT + SKILLS */}
        {activeTab === 'details' && (
          <>
            {/* STATUS REASON */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <div style={sectionLabelStyle}>STATUS REASON</div>
              <div
                style={{
                  borderLeft: '3px solid var(--border)',
                  paddingLeft: '12px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  fontStyle: 'italic',
                }}
              >
                {agent.status === 'working' || agent.status === 'thinking' || agent.status === 'executing_tool'
                  ? 'Agent is currently working on assigned tasks.'
                  : agent.status === 'idle'
                  ? 'Agent is idle, ready for new tasks.'
                  : agent.status === 'paused'
                  ? 'Agent is paused by operator.'
                  : 'Agent is offline or disconnected.'}
              </div>
            </div>

            {/* ABOUT */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <div style={sectionLabelStyle}>ABOUT</div>
              {isEditingDesc && (
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)', marginBottom: '6px' }} />
              )}
              {isEditingDesc ? (
                <textarea
                  autoFocus
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onBlur={handleDescSave}
                  disabled={descSaving}
                  rows={5}
                  style={{
                    width: '100%',
                    fontSize: '13px',
                    fontFamily: 'var(--font-body)',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    background: 'transparent',
                    border: '1px solid var(--accent)',
                    borderRadius: '4px',
                    padding: '8px',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              ) : (
                <div
                  onClick={() => setIsEditingDesc(true)}
                  style={{
                    fontSize: '13px',
                    color: descDraft ? 'var(--text-secondary)' : 'var(--text-muted)',
                    fontStyle: descDraft ? 'normal' : 'italic',
                    lineHeight: 1.6,
                    cursor: 'text',
                    minHeight: '24px',
                  }}
                >
                  {descDraft || 'No description.'}
                </div>
              )}
              {descError && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--negative)' }}>{descError}</div>
              )}
            </div>

            {/* SKILLS */}
            <div style={{ padding: '16px' }}>
              <div style={sectionLabelStyle}>SKILLS</div>
              {agent.skills && agent.skills.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {agent.skills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        fontFamily: 'var(--font-body)',
                        background: 'var(--surface)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        padding: '3px 8px',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No skills defined.</div>
              )}
            </div>
          </>
        )}

        {/* Timeline tab */}
        {activeTab === 'timeline' && (
          <div>
            <div style={{ padding: '16px' }}>
              {activities.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No recent activity.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activities.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.action}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>{relativeTime(item.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <ContextBreadcrumbs events={systemEvents} />
          </div>
        )}

        {/* Messages tab */}
        {activeTab === 'messages' && (
          <ChatPanel agentId={agent.agent_id} agentName={agent.name} />
        )}
      </div>
    </div>
  )
}
