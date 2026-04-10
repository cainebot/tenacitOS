'use client'

import { useState, useEffect } from 'react'
import { Users01, LayoutLeft, LayoutRight } from '@untitledui/icons'
import { Avatar, Badge, StatusBadge, Tooltip, TooltipTrigger, cx, type StatusType, type BadgeVariant } from '@openclaw/ui'
import { useAgentFilter } from '@/contexts/AgentFilterContext'
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

/** Map agent status to UUI StatusType */
function agentStatusToStatusType(status: string): StatusType {
  switch (status) {
    case 'working': case 'thinking': case 'executing_tool': return 'active'
    case 'paused': return 'warning'
    case 'idle': case 'queued': return 'info'
    case 'error': return 'error'
    case 'offline': default: return 'inactive'
  }
}

/** Map badge type to UUI BadgeVariant */
function badgeVariant(badge?: string): BadgeVariant {
  switch (badge) {
    case 'LEAD': return 'error'
    case 'SPC': return 'warning'
    case 'INT': return 'info'
    default: return 'gray'
  }
}

export function AgentListPanel() {
  const { agents, selectedAgentId, setSelectedAgentId, setAgentPanelOpen, projectLeadAgentId } = useAgentFilter()
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
    const aIsSM = a.agent_id === projectLeadAgentId ? -1 : 0
    const bIsSM = b.agent_id === projectLeadAgentId ? -1 : 0
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

  return (
    <aside
      className={cx(
        "sticky top-0 h-screen flex flex-col shrink-0 bg-secondary border-r border-secondary overflow-hidden transition-[width,min-width] duration-200 ease-in-out",
        collapsed ? "w-12 min-w-12" : "w-[260px] min-w-[260px]"
      )}
    >
      {/* Header -- "AGENTS  N" */}
      {!collapsed ? (
        <div className="px-4 pt-4 pb-3 flex items-center gap-2">
          <span className="font-display text-[11px] font-bold text-quaternary tracking-widest">
            AGENTS
          </span>
          <span className="text-[11px] font-medium text-quaternary bg-tertiary rounded-full px-[7px] py-px">
            {agents.length}
          </span>
        </div>
      ) : (
        <TooltipTrigger delay={300}>
          <div className="pt-3.5 pb-2.5 flex items-center justify-center" role="button" tabIndex={0}>
            <Users01 className="size-4 text-quaternary" />
          </div>
          <Tooltip placement="left">AGENTS ({agents.length})</Tooltip>
        </TooltipTrigger>
      )}

      {/* "All Agents" row */}
      {!collapsed && (
        <button
          onClick={handleAllAgentsClick}
          className={cx(
            "flex items-center gap-2.5 w-full px-4 py-2 border-none cursor-pointer text-left transition-colors",
            selectedAgentId === null
              ? "bg-brand-solid/[0.06] border-l-[3px] border-l-brand-600"
              : "border-l-[3px] border-l-transparent hover:bg-tertiary"
          )}
        >
          <Avatar size="sm" placeholderIcon={Users01} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-primary">
              All Agents
            </div>
            <div className="text-[10px] font-medium text-quaternary mt-px">
              {agents.length} total
            </div>
          </div>
          <span className="text-[10px] font-semibold text-success-primary">
            {activeCount} ACTIVE
          </span>
        </button>
      )}

      {/* Divider */}
      <div className={cx("h-px bg-primary", collapsed ? "mx-1" : "mx-0")} />

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto">
        {sortedAgents.map((agent) => {
          const isSelected = selectedAgentId === agent.agent_id

          const agentButton = (
            <button
              {...(!collapsed ? { key: agent.agent_id } : {})}
              onClick={() => handleAgentClick(agent.agent_id)}
              className={cx(
                "flex w-full border-none cursor-pointer transition-colors",
                collapsed
                  ? "items-center justify-center py-2"
                  : "items-center gap-2.5 px-4 py-2.5 text-left",
                isSelected ? "bg-brand-solid/[0.06]" : "hover:bg-tertiary"
              )}
            >
              {/* Avatar */}
              <Avatar
                size={collapsed ? "xs" : "sm"}
                emoji={agent.emoji || undefined}
                initials={!agent.emoji ? agent.name.charAt(0) : undefined}
                status={collapsed ? (agentStatusToStatusType(agent.status) === 'active' ? 'online' : 'offline') : undefined}
              />

              {/* Name + badge + role -- expanded only */}
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  {/* Line 1: Name + Badge pill */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cx(
                        "text-[13px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap",
                        isSelected ? "text-brand-secondary" : "text-primary"
                      )}
                    >
                      {agent.name}
                    </span>
                    {/* Badge pill -- LEAD for scrum master, or agent's own badge */}
                    {(agent.agent_id === projectLeadAgentId || (agent.badge && agent.badge !== 'LEAD')) && (
                      <Badge
                        variant={agent.agent_id === projectLeadAgentId ? 'error' : badgeVariant(agent.badge)}
                        size="sm"
                        className="text-[9px] font-bold uppercase tracking-wide"
                      >
                        {agent.agent_id === projectLeadAgentId ? 'LEAD' : agent.badge}
                      </Badge>
                    )}
                  </div>
                  {/* Line 2: Role */}
                  <div className="text-[10px] font-medium text-quaternary overflow-hidden text-ellipsis whitespace-nowrap mt-0.5">
                    {roleLabel(agent.role)}
                  </div>
                </div>
              )}

              {/* Status badge -- expanded only */}
              {!collapsed && (
                <StatusBadge
                  status={agentStatusToStatusType(agent.status)}
                  label={statusLabel(agent.status)}
                  size="sm"
                  showDot
                />
              )}

              {/* Attention badge -- expanded only */}
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

          if (collapsed) {
            return (
              <TooltipTrigger key={agent.agent_id} delay={300}>
                {agentButton}
                <Tooltip placement="left">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-sm">{agent.name}</span>
                    <span className="text-xs text-tertiary">{statusLabel(agent.status)}</span>
                  </div>
                </Tooltip>
              </TooltipTrigger>
            )
          }

          return agentButton
        })}
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-secondary px-1.5 py-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand agents' : 'Collapse agents'}
          className={cx(
            "flex items-center w-full py-2 border-none cursor-pointer text-quaternary text-xs rounded-md transition-colors hover:bg-tertiary hover:text-primary",
            collapsed ? "justify-center" : "gap-2 px-2"
          )}
        >
          {collapsed ? <LayoutRight className="size-3.5" /> : <LayoutLeft className="size-3.5" />}
        </button>
      </div>
    </aside>
  )
}
