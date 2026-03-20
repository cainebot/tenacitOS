'use client'

import { useState, useEffect } from 'react'
import { PanelLeftClose, PanelLeftOpen, Users } from 'lucide-react'
import { useAgentFilter } from '@/contexts/AgentFilterContext'
import { StatusDot } from '@/components/atoms/StatusDot'
import { AttentionBadge } from '@/components/atoms/AttentionBadge'

/** Map agent status to display label */
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
      return 'INACTIVE'
    case 'error':
      return 'ERROR'
    default:
      return 'OFFLINE'
  }
}

/** Get left accent bar color based on agent status */
function accentBarColor(status: string): string {
  switch (status) {
    case 'working':
    case 'thinking':
    case 'executing_tool':
      return 'var(--positive, #32D74B)'
    case 'paused':
      return 'var(--warning, #FFD60A)'
    case 'idle':
    case 'queued':
      return 'var(--info, #0A84FF)'
    case 'offline':
    case 'error':
      return 'var(--negative, #FF453A)'
    default:
      return 'var(--border-primary)'
  }
}

/** Badge color by type */
function badgeColors(badge?: string): { bg: string; color: string } {
  switch (badge) {
    case 'LEAD':
      return { bg: 'rgba(255,59,48,0.12)', color: '#FF3B30' }
    case 'SPC':
      return { bg: 'rgba(249,115,22,0.12)', color: '#f97316' }
    case 'INT':
      return { bg: 'rgba(10,132,255,0.12)', color: '#0A84FF' }
    default:
      return { bg: 'rgba(82,82,82,0.12)', color: "var(--text-quaternary-500)" }
  }
}

/** Map role to display name */
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

export function AgentListPanel() {
  const { agents, selectedAgentId, setSelectedAgentId, setAgentPanelOpen, scrumMasterAgentId } = useAgentFilter()
  const [collapsed, setCollapsed] = useState(false)

  // Attention counts per agent
  const [attentionData, setAttentionData] = useState<Record<string, { total: number; failed_tasks: number; unread_messages: number; attention_cards: number }>>({})

  useEffect(() => {
    if (agents.length === 0) return
    // Fetch attention counts for all agents in parallel
    Promise.all(
      agents.map((agent) =>
        fetch(`/api/agents/${agent.agent_id}/attention`)
          .then((r) => r.ok ? r.json() : { total: 0, failed_tasks: 0, unread_messages: 0, attention_cards: 0 })
          .catch(() => ({ total: 0, failed_tasks: 0, unread_messages: 0, attention_cards: 0 }))
          .then((data) => [agent.agent_id, data] as const)
      )
    ).then((results) => {
      setAttentionData(Object.fromEntries(results))
    })
  }, [agents])

  const activeCount = agents.filter((a) =>
    ['working', 'thinking', 'executing_tool', 'paused', 'idle', 'queued'].includes(a.status)
  ).length

  // Sort: Scrum Master (from board FK) sorts first, then alphabetical
  const sortedAgents = [...agents].sort((a, b) => {
    const aIsSM = a.agent_id === scrumMasterAgentId ? -1 : 0
    const bIsSM = b.agent_id === scrumMasterAgentId ? -1 : 0
    if (aIsSM !== bIsSM) return aIsSM - bIsSM
    return a.name.localeCompare(b.name)
  })

  const handleAgentClick = (agentId: string) => {
    if (selectedAgentId === agentId) {
      setSelectedAgentId(null)
      setAgentPanelOpen(false)
    } else {
      setSelectedAgentId(agentId)
      setAgentPanelOpen(true)
    }
  }

  const handleAllAgentsClick = () => {
    setSelectedAgentId(null)
    setAgentPanelOpen(false)
  }

  if (agents.length === 0) return null

  const panelWidth = collapsed ? 48 : 260

  return (
    <aside
      style={{
        width: `${panelWidth}px`,
        minWidth: `${panelWidth}px`,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: "var(--bg-secondary)",
        borderRight: '1px solid var(--border-primary)',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Header — "AGENTS  N" */}
      {!collapsed ? (
        <div
          style={{
            padding: '16px 16px 12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-sora), system-ui, sans-serif',
              fontSize: '11px',
              fontWeight: 700,
              color: "var(--text-quaternary-500)",
              letterSpacing: '0.08em',
            }}
          >
            AGENTS
          </span>
          <span
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '11px',
              fontWeight: 500,
              color: "var(--text-quaternary-500)",
              background: 'rgba(82,82,82,0.15)',
              borderRadius: '9999px',
              padding: '1px 7px',
            }}
          >
            {agents.length}
          </span>
        </div>
      ) : (
        <div
          style={{
            padding: '14px 0 10px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Users size={16} style={{ color: "var(--text-quaternary-500)" }} />
        </div>
      )}

      {/* "All Agents" row — like reference */}
      {!collapsed && (
        <button
          onClick={handleAllAgentsClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '8px 16px',
            background: selectedAgentId === null ? 'rgba(255,59,48,0.06)' : 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            borderLeft: selectedAgentId === null ? '3px solid var(--brand-600)' : '3px solid transparent',
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => {
            if (selectedAgentId !== null) e.currentTarget.style.background = 'var(--bg-tertiary)'
          }}
          onMouseLeave={(e) => {
            if (selectedAgentId !== null) e.currentTarget.style.background = 'none'
          }}
        >
          {/* All agents icon */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Users size={16} style={{ color: "var(--text-tertiary-600)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                color: "var(--text-primary-900)",
              }}
            >
              All Agents
            </div>
            <div
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '10px',
                fontWeight: 500,
                color: "var(--text-quaternary-500)",
                marginTop: '1px',
              }}
            >
              {agents.length} total
            </div>
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              color: 'var(--positive, #32D74B)',
            }}
          >
            {activeCount} ACTIVE
          </span>
        </button>
      )}

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: 'var(--border-primary)', margin: collapsed ? '4px 4px' : '4px 0' }} />

      {/* Agent list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sortedAgents.map((agent) => {
          const isSelected = selectedAgentId === agent.agent_id

          return (
            <button
              key={agent.agent_id}
              onClick={() => handleAgentClick(agent.agent_id)}
              title={collapsed ? `${agent.name} — ${statusLabel(agent.status)}` : undefined}
              style={{
                display: 'flex',
                alignItems: collapsed ? 'center' : 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : '10px',
                width: '100%',
                padding: collapsed ? '8px 0' : '10px 16px',
                background: isSelected ? 'rgba(255,59,48,0.06)' : 'none',
                border: 'none',
                borderLeft: 'none',
                cursor: 'pointer',
                transition: 'background 0.1s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'var(--bg-tertiary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isSelected ? 'rgba(255,59,48,0.06)' : 'none'
              }}
            >
              {/* Avatar circle */}
              <div
                style={{
                  width: collapsed ? '28px' : '32px',
                  height: collapsed ? '28px' : '32px',
                  borderRadius: '50%',
                  background: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: collapsed ? '13px' : '16px',
                  lineHeight: 1,
                  position: 'relative',
                  marginLeft: 0,
                }}
              >
                {agent.emoji || agent.name.charAt(0)}
                {/* Status dot overlay when collapsed */}
                {collapsed && (
                  <span style={{ position: 'absolute', bottom: '-1px', right: '-1px' }}>
                    <StatusDot status={agent.status} variant="agent" />
                  </span>
                )}
              </div>

              {/* Name + badge + role — expanded only */}
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Line 1: Name + Badge pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: isSelected ? 'var(--brand-600)' : 'var(--text-primary-900)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {agent.name}
                    </span>
                    {/* Badge pill — LEAD for scrum master (from board FK), or agent's own badge if not LEAD */}
                    {(agent.agent_id === scrumMasterAgentId || (agent.badge && agent.badge !== 'LEAD')) && (
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                          background: agent.agent_id === scrumMasterAgentId
                            ? 'rgba(255,59,48,0.12)'
                            : badgeColors(agent.badge).bg,
                          color: agent.agent_id === scrumMasterAgentId
                            ? '#FF3B30'
                            : badgeColors(agent.badge).color,
                          borderRadius: '4px',
                          padding: '1px 5px',
                          flexShrink: 0,
                          lineHeight: '14px',
                        }}
                      >
                        {agent.agent_id === scrumMasterAgentId ? 'LEAD' : agent.badge}
                      </span>
                    )}
                  </div>
                  {/* Line 2: Role */}
                  <div
                    style={{
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '10px',
                      fontWeight: 500,
                      color: "var(--text-quaternary-500)",
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: '2px',
                    }}
                  >
                    {roleLabel(agent.role)}
                  </div>
                </div>
              )}

              {/* Status dot + label — expanded only */}
              {!collapsed && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  <StatusDot status={agent.status} variant="agent" />
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      color: accentBarColor(agent.status),
                    }}
                  >
                    {statusLabel(agent.status)}
                  </span>
                </span>
              )}

              {/* Attention badge — expanded only */}
              {!collapsed && (() => {
                const attn = attentionData[agent.agent_id]
                if (!attn || attn.total === 0) return null
                return (
                  <AttentionBadge
                    total={attn.total}
                    failedTasks={attn.failed_tasks}
                    unreadMessages={attn.unread_messages}
                    attentionCards={attn.attention_cards}
                  />
                )
              })()}
            </button>
          )
        })}
      </div>

      {/* Collapse toggle */}
      <div style={{ borderTop: "1px solid var(--border-primary)", padding: '4px 6px' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand agents' : 'Collapse agents'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '8px',
            width: '100%',
            padding: collapsed ? '8px 0' : '8px 8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: "var(--text-quaternary-500)",
            fontSize: '12px',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            borderRadius: '6px',
            transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)'
            e.currentTarget.style.color = 'var(--text-primary-900)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = 'var(--text-quaternary-500)'
          }}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>
    </aside>
  )
}
