'use client'

import {
  Bot,
  HardDrive,
  Users,
  Activity,
  GitBranch,
  LayoutGrid,
  Tag,
  Building2,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { AgentOrganigrama } from '@/components/AgentOrganigrama'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import { useRealtimeDepartments } from '@/hooks/useRealtimeDepartments'
import { StatusDot } from '@/components/atoms/StatusDot'
import type { AgentRow, AgentStatus } from '@/types/supabase'

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: '#4ade80',
  working: '#f59e0b',
  error: '#ef4444',
  offline: '#6b7280',
  thinking: '#3b82f6',
  queued: '#eab308',
}

const formatLastActivity = (timestamp?: string) => {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Compatibility shim: AgentOrganigrama expects the old Agent shape
// We pass a minimal compatible object from AgentRow
function toOrganigramaAgent(agent: AgentRow) {
  return {
    id: agent.agent_id,
    name: agent.name,
    emoji: agent.emoji,
    color: '#6366f1',
    model: (agent.metadata as Record<string, string>)?.model ?? 'unknown',
    workspace: (agent.metadata as Record<string, string>)?.workspace ?? '',
    allowAgents: [],
    status: (agent.status === 'idle' || agent.status === 'offline') ? agent.status as 'online' | 'offline' : 'online',
    activeSessions: 0,
  }
}

export default function AgentsPage() {
  const { agents, loading } = useRealtimeAgents()
  const { departments } = useRealtimeDepartments()
  const [activeTab, setActiveTab] = useState<'cards' | 'organigrama'>('cards')

  const getDepartment = (departmentId?: string | null) => {
    if (!departmentId) return null
    return departments.find((d) => d.id === departmentId) ?? null
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-lg" style={{ color: 'var(--text-muted)' }}>
            Loading agents...
          </div>
        </div>
      </div>
    )
  }

  const orgAgents = agents.map(toOrganigramaAgent)

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-bold mb-2"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--text-primary)',
            letterSpacing: '-1.5px',
          }}
        >
          <Users className="inline-block w-8 h-8 mr-2 mb-1" />
          Agents
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Multi-agent system overview • {agents.length} agents configured
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        {[
          { id: 'cards' as const, label: 'Agent Cards', icon: LayoutGrid },
          { id: 'organigrama' as const, label: 'Organigrama', icon: GitBranch },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-4 py-2 font-medium transition-all"
            style={{
              color: activeTab === id ? 'var(--accent)' : 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottomStyle: 'solid',
              borderBottomWidth: '2px',
              borderBottomColor: activeTab === id ? 'var(--accent)' : 'transparent',
              paddingBottom: '0.5rem',
            }}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Organigrama View */}
      {activeTab === 'organigrama' && (
        <div className="rounded-xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Agent Hierarchy</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Visualization of agent communication allowances</p>
          </div>
          <AgentOrganigrama agents={orgAgents} />
        </div>
      )}

      {/* Agents Grid */}
      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agents.map((agent) => {
            const statusColor = STATUS_COLORS[agent.status] || '#6b7280'
            const department = getDepartment(agent.department_id)
            const agentColor = department?.color ?? '#6366f1'

            return (
              <div
                key={agent.agent_id}
                className="rounded-xl overflow-hidden transition-all hover:scale-[1.01]"
                style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                }}
              >
                {/* Header with status */}
                <div
                  className="px-5 py-4 flex items-center justify-between"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: `linear-gradient(135deg, ${agentColor}15, transparent)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{
                        backgroundColor: `${agentColor}20`,
                        border: `2px solid ${agentColor}`,
                      }}
                    >
                      {agent.emoji}
                    </div>
                    <div>
                      <h3
                        className="text-lg font-bold"
                        style={{
                          fontFamily: 'var(--font-heading)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {agent.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusDot status={agent.status} variant="agent" />
                        <span className="text-xs font-medium" style={{ color: statusColor }}>
                          {agent.status}
                        </span>
                        {agent.badge && (
                          <span
                            className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor:
                                agent.badge === 'LEAD'
                                  ? '#f59e0b20'
                                  : agent.badge === 'SPC'
                                  ? '#3b82f620'
                                  : '#22c55e20',
                              color:
                                agent.badge === 'LEAD'
                                  ? '#f59e0b'
                                  : agent.badge === 'SPC'
                                  ? '#3b82f6'
                                  : '#22c55e',
                            }}
                          >
                            {agent.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Profile link */}
                  <Link
                    href={`/agents/${agent.agent_id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: `${agentColor}15`,
                      border: `1px solid ${agentColor}40`,
                      color: agentColor,
                    }}
                    title="View full profile"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Profile
                  </Link>
                </div>

                {/* Details */}
                <div className="p-5 space-y-3">
                  {/* Model */}
                  {(agent.metadata as Record<string, string>)?.model && (
                    <div className="flex items-start gap-3">
                      <Bot className="w-4 h-4 mt-0.5" style={{ color: agentColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                          Model
                        </div>
                        <div className="text-sm font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                          {(agent.metadata as Record<string, string>).model}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Workspace */}
                  {(agent.metadata as Record<string, string>)?.workspace && (
                    <div className="flex items-start gap-3">
                      <HardDrive className="w-4 h-4 mt-0.5" style={{ color: agentColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                          Workspace
                        </div>
                        <div
                          className="text-sm font-mono truncate"
                          style={{ color: 'var(--text-primary)' }}
                          title={(agent.metadata as Record<string, string>).workspace}
                        >
                          {(agent.metadata as Record<string, string>).workspace}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Department badge */}
                  {department && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4" style={{ color: agentColor }} />
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${department.color}20`,
                          color: department.color,
                          border: `1px solid ${department.color}40`,
                        }}
                      >
                        {department.icon} {department.display_name}
                      </span>
                    </div>
                  )}

                  {/* Skills */}
                  {agent.skills && agent.skills.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Tag className="w-4 h-4 mt-0.5" style={{ color: agentColor }} />
                      <div className="flex flex-wrap gap-1">
                        {agent.skills.map((skill) => (
                          <span
                            key={skill}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${agentColor}15`,
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Last Activity */}
                  <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Last activity: {formatLastActivity(agent.last_activity)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
