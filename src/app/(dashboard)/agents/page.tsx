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
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { AgentOrganigrama } from '@/components/AgentOrganigrama'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import { useRealtimeDepartments } from '@/hooks/useRealtimeDepartments'
import { cx } from '@openclaw/ui'
import { StatusDot } from '@/components/atoms/StatusDot'
import { AgentFormPanel } from '@/components/organisms/AgentFormPanel'
import type { AgentRow, AgentStatus } from '@/types/supabase'

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'text-success',
  working: 'text-warning',
  error: 'text-error-600',
  offline: 'text-quaternary',
  thinking: 'text-info',
  queued: 'text-warning',
  executing_tool: 'text-warning',
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
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editAgent, setEditAgent] = useState<AgentRow | null>(null)

  const getDepartment = (departmentId?: string | null) => {
    if (!departmentId) return null
    return departments.find((d) => d.id === departmentId) ?? null
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-lg text-quaternary">
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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1
            className="text-3xl font-bold mb-2 font-display text-primary"
            style={{ letterSpacing: '-1.5px' }}
          >
            <Users className="inline-block w-8 h-8 mr-2 mb-1" />
            Agents
          </h1>
          <p className="text-secondary text-sm">
            Multi-agent system overview • {agents.length} agents configured
          </p>
        </div>
        <button
          onClick={() => { setFormMode('create'); setEditAgent(null) }}
          className="bg-brand-50 text-white rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 cursor-pointer border-none"
        >
          <Plus size={16} />
          New Agent
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 border-b border-secondary">
        {[
          { id: 'cards' as const, label: 'Agent Cards', icon: LayoutGrid },
          { id: 'organigrama' as const, label: 'Organigrama', icon: GitBranch },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={[
              'flex items-center gap-2 px-4 py-2 font-medium transition-all bg-transparent border-none cursor-pointer pb-2 border-b-2',
              activeTab === id
                ? 'text-brand-600 border-accent'
                : 'text-secondary border-transparent',
            ].join(' ')}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Organigrama View */}
      {activeTab === 'organigrama' && (
        <div className="rounded-xl bg-secondary border border-secondary">
          <div className="px-5 py-4 border-b border-secondary">
            <h2 className="font-semibold text-primary">Agent Hierarchy</h2>
            <p className="text-sm text-quaternary">Visualization of agent communication allowances</p>
          </div>
          <AgentOrganigrama agents={orgAgents} />
        </div>
      )}

      {/* Agents Grid */}
      {activeTab === 'cards' && agents.length === 0 && !loading && (
        <div className="text-center py-12 text-quaternary text-sm">
          No agents configured. Click &ldquo;New Agent&rdquo; to create one.
        </div>
      )}
      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agents.map((agent) => {
            const statusColor = STATUS_COLORS[agent.status] || 'text-quaternary'
            const department = getDepartment(agent.department_id)
            const agentColor = department?.color ?? '#6366f1'

            return (
              <div
                key={agent.agent_id}
                className="rounded-xl overflow-hidden transition-all hover:scale-[1.01] bg-secondary border border-secondary cursor-pointer"
                onClick={() => { setFormMode('edit'); setEditAgent(agent) }}
              >
                {/* Header with status */}
                <div
                  className="px-5 py-4 flex items-center justify-between border-b border-secondary"
                  style={{
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
                      <h3 className="text-lg font-bold font-display text-primary">
                        {agent.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusDot status={agent.status} variant="agent" />
                        <span className={`text-xs font-medium ${statusColor}`}>
                          {agent.status}
                        </span>
                        {agent.badge && (
                          <span
                            className={cx(
                              "text-xs font-bold px-1.5 py-0.5 rounded",
                              agent.badge === 'LEAD' && "bg-warning/10 text-warning",
                              agent.badge === 'SPC' && "bg-info/10 text-info",
                              agent.badge !== 'LEAD' && agent.badge !== 'SPC' && "bg-success/10 text-success",
                            )}
                          >
                            {agent.badge}
                          </span>
                        )}
                        {agent.soul_dirty === true && (
                          <span className="text-warning text-[9px] font-semibold rounded px-1.5 py-px bg-warning/15">
                            Needs sync
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
                    onClick={(e) => e.stopPropagation()}
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
                        <div className="text-xs font-medium mb-1 text-quaternary">
                          Model
                        </div>
                        <div className="text-sm font-mono truncate text-primary">
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
                        <div className="text-xs font-medium mb-1 text-quaternary">
                          Workspace
                        </div>
                        <div
                          className="text-sm font-mono truncate text-primary"
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
                            className="text-xs px-2 py-0.5 rounded-full text-secondary border border-secondary"
                            style={{
                              backgroundColor: `${agentColor}15`,
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Last Activity */}
                  <div className="flex items-center justify-between pt-2 border-t border-secondary">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-quaternary" />
                      <span className="text-xs text-quaternary">
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

      {/* Agent Form Panel (create / edit) */}
      {formMode && (
        <AgentFormPanel
          mode={formMode}
          agent={editAgent}
          onClose={() => { setFormMode(null); setEditAgent(null) }}
          onSaved={() => { setFormMode(null); setEditAgent(null) }}
        />
      )}
    </div>
  )
}
