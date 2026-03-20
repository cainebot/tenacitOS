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

function statusPillClasses(status: string): { bg: string; color: string } {
  switch (status) {
    case 'working':
    case 'thinking':
    case 'executing_tool':
      return { bg: 'bg-success/15', color: 'text-success' }
    case 'paused':
      return { bg: 'bg-warning/15', color: 'text-warning' }
    case 'idle':
    case 'queued':
      return { bg: 'bg-info/15', color: 'text-info' }
    default:
      return { bg: 'bg-error/15', color: 'text-error' }
  }
}

function badgeClasses(badge?: string): { bg: string; color: string } {
  switch (badge) {
    case 'LEAD':
      return { bg: 'bg-error/10', color: 'text-error' }
    case 'SPC':
      return { bg: 'bg-warning/10', color: 'text-warning' }
    case 'INT':
      return { bg: 'bg-info/10', color: 'text-info' }
    default:
      return { bg: 'bg-muted/10', color: 'text-muted' }
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

interface AgentSidePanelProps {
  agent: AgentListItem
  boardId: string
  onClose: () => void
}

type TabId = 'details' | 'timeline' | 'messages'

export function AgentSidePanel({ agent, boardId, onClose }: AgentSidePanelProps) {
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
    fetch(`/api/activities?agent=${agent.agent_id}&limit=5`)
      .then((r) => r.ok ? r.json() : { activities: [] })
      .then((json: { activities?: ActivityItem[] }) => setActivities(Array.isArray(json.activities) ? json.activities.slice(0, 5) : []))
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
    fetch(`/api/activities?agent=${agent.agent_id}&limit=10`)
      .then((r) => r.ok ? r.json() : { activities: [] })
      .then((json: { activities?: Array<{ description: string; created_at: string }> }) => {
        setSystemEvents(
          Array.isArray(json.activities)
            ? json.activities.map((item) => ({ description: item.description, created_at: item.created_at }))
            : []
        )
      })
      .catch(() => setSystemEvents([]))
  }, [agent.agent_id])

  const statusPill = statusPillClasses(agent.status)
  const agentBadge = badgeClasses(agent.badge)
  const attentionCount = attentionInfo.total

  // Suppress unused variable warning — assignedCards kept for potential future card list rendering
  void cardsLoading
  void assignedCards

  return (
    <div
      className="fixed right-0 top-0 bottom-0 w-[380px] bg-surface-elevated border-l border-border z-[49] translate-x-0 transition-transform duration-200 ease-out shadow-[-4px_0_24px_rgba(0,0,0,0.2)] overflow-y-auto flex flex-col"
      role="complementary"
      aria-label={`Agent profile: ${agent.name}`}
    >

      {/* AGENT PROFILE header bar */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <span className="text-[11px] font-bold tracking-[0.08em] text-muted font-heading">
          AGENT PROFILE
        </span>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center bg-transparent border-0 cursor-pointer text-muted rounded hover:text-primary transition-colors"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Profile: horizontal layout — avatar left, info right */}
      <div className="p-4 flex items-start gap-3.5 border-b border-border">
        {/* Avatar */}
        <span className="w-12 h-12 rounded-full bg-surface text-secondary flex items-center justify-center text-2xl flex-shrink-0">
          {agent.emoji || agent.name.charAt(0).toUpperCase()}
        </span>

        {/* Info column */}
        <div className="flex-1 min-w-0">
          {/* Name + attention count */}
          <div className="flex items-center gap-2">
            <div className="text-base font-bold text-primary font-heading leading-tight">
              {agent.name}
            </div>
            {attentionCount > 0 && (
              <span
                title={`${attentionInfo.unread_messages} unread, ${attentionInfo.failed_tasks} failed tasks, ${attentionInfo.attention_cards} attention cards`}
                className="min-w-[18px] h-[18px] rounded-full bg-error text-white text-[10px] font-bold inline-flex items-center justify-center px-1"
              >
                {attentionCount > 9 ? '9+' : attentionCount}
              </span>
            )}
          </div>

          {/* Role */}
          <div className="text-xs font-medium text-secondary mt-0.5">
            {roleLabel(agent.role)}
          </div>

          {/* Badge + Status pill row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {agent.badge && (
              <span
                className={`text-[10px] font-bold uppercase rounded-full px-2.5 py-0.5 ${agentBadge.bg} ${agentBadge.color}`}
              >
                {agent.badge === 'LEAD' ? 'Lead' : agent.badge === 'SPC' ? 'Specialist' : agent.badge === 'INT' ? 'Intern' : agent.badge}
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-bold rounded-full px-3 py-0.5 ${statusPill.bg} ${statusPill.color}`}
            >
              <StatusDot status={agent.status} variant="agent" />
              {statusLabel(agent.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs: Details | Timeline | Messages — right after profile */}
      <div className="flex border-b border-border px-4 flex-shrink-0">
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
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 px-1 bg-transparent border-0 cursor-pointer text-[11px] transition-colors ${isActive ? 'font-semibold text-primary border-b-2 border-accent' : 'font-medium text-muted border-b-2 border-transparent'}`}
            >
              <Icon size={13} />
              {tab.label}
              {tab.id === 'messages' && unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-accent text-white text-[9px] font-bold inline-flex items-center justify-center ml-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content — scrollable */}
      <div className="flex-1 overflow-y-auto">

        {/* Details tab: STATUS REASON + ABOUT + SKILLS */}
        {activeTab === 'details' && (
          <>
            {/* STATUS REASON */}
            <div className="p-4 border-b border-border">
              <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-muted mb-2">STATUS REASON</div>
              <div className="border-l-[3px] border-border pl-3 text-xs text-secondary leading-relaxed italic">
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
            <div className="p-4 border-b border-border">
              <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-muted mb-2">ABOUT</div>
              {isEditingDesc && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning mb-1.5" />
              )}
              {isEditingDesc ? (
                <textarea
                  autoFocus
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onBlur={handleDescSave}
                  disabled={descSaving}
                  rows={5}
                  className="w-full text-[13px] text-secondary leading-relaxed bg-transparent border border-accent rounded px-2 py-2 resize-vertical outline-none box-border"
                />
              ) : (
                <div
                  onClick={() => setIsEditingDesc(true)}
                  className={`text-[13px] leading-relaxed cursor-text min-h-6 ${descDraft ? 'text-secondary' : 'text-muted italic'}`}
                >
                  {descDraft || 'No description.'}
                </div>
              )}
              {descError && (
                <div className="mt-1.5 text-xs text-error">{descError}</div>
              )}
            </div>

            {/* SKILLS */}
            <div className="p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-muted mb-2">SKILLS</div>
              {agent.skills && agent.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {agent.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] font-medium bg-surface text-secondary border border-border rounded px-2 py-0.5"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-muted italic">No skills defined.</div>
              )}
            </div>
          </>
        )}

        {/* Timeline tab */}
        {activeTab === 'timeline' && (
          <div>
            <div className="p-4">
              {activities.length === 0 ? (
                <div className="text-[11px] text-muted italic">No recent activity.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {activities.map((item, i) => (
                    <div key={i} className="flex justify-between gap-2">
                      <span className="text-[11px] text-secondary leading-snug">{item.action}</span>
                      <span className="text-[10px] text-muted flex-shrink-0">{relativeTime(item.created_at)}</span>
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
