'use client'

import { type FC, type JSX, useState, useMemo, useCallback } from 'react'
import { Button as AriaButton } from 'react-aria-components'
import { cx, Button, FeaturedIcon, Avatar } from '@circos/ui'
import { Users01, Plus } from '@untitledui/icons'
import { useAgentProjectRoles } from '@/hooks/use-agent-project-roles'
import { TeamChartNode, type OrgNode } from './team-chart-node'
import { TeamChartSidePanel } from './team-chart-side-panel'
import type { AgentRow } from '@/types/supabase'

// ---------------------------------------------------------------------------
// TeamChart props
// ---------------------------------------------------------------------------

interface TeamChartProps {
  projectId: string
  projectLeadAgentId: string | null
  agents: AgentRow[]
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TeamChartSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 animate-pulse">
      <div className="h-[80px] w-[180px] rounded-lg bg-secondary" />
      <div className="w-px h-5 bg-tertiary" />
      <div className="flex gap-8">
        <div className="h-[80px] w-[160px] rounded-lg bg-secondary" />
        <div className="h-[80px] w-[160px] rounded-lg bg-secondary" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TeamChart component
// ---------------------------------------------------------------------------

export const TeamChart: FC<TeamChartProps> = ({
  projectId,
  projectLeadAgentId,
  agents,
}) => {
  const { roles, loading, error: hookError, createRole, updateRole, deleteRole } = useAgentProjectRoles(projectId)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const [pendingAgent, setPendingAgent] = useState<AgentRow | null>(null)

  // Agents not yet in the project
  const unassignedAgents = useMemo(
    () => agents.filter((a) => !roles.some((r) => r.agent_id === a.agent_id)),
    [agents, roles]
  )

  // Assign agent handler
  const handleAssignAgent = useCallback(async (agentId: string) => {
    try {
      await createRole({ agent_id: agentId, project_id: projectId })
      setShowAgentPicker(false)
    } catch (err) {
      console.error('[team-chart] Failed to assign agent:', err)
    }
  }, [createRole, projectId])

  // Build org tree from roles + agents data
  const { roots, allNodes } = useMemo(() => {
    const nodeMap = new Map<string, OrgNode>()

    for (const role of roles) {
      const agent = agents.find((a) => a.agent_id === role.agent_id)
      if (!agent) continue
      nodeMap.set(role.agent_id, {
        agent_id: role.agent_id,
        name: agent.name,
        emoji: agent.emoji,
        avatar_url: agent.avatar_url ?? null,
        title: role.title,
        role: role.role,
        status: agent.status,
        reports_to: role.reports_to,
        children: [],
      })
    }

    // Group nodes by their reports_to value
    const byReportsTo = new Map<string | null, OrgNode[]>()
    for (const node of nodeMap.values()) {
      const key = node.reports_to ?? null
      byReportsTo.set(key, [...(byReportsTo.get(key) ?? []), node])
    }

    // Recursively build tree with depth guard (D-19 / T-88-12)
    function build(managerId: string | null, depth = 0): OrgNode[] {
      if (depth > 10) return []
      return (byReportsTo.get(managerId) ?? []).map((node) => ({
        ...node,
        children: build(node.agent_id, depth + 1),
      }))
    }

    const roots = build(null)
    return { roots, allNodes: Array.from(nodeMap.values()) }
  }, [roles, agents])

  // Separate PL subtree from freelancer nodes (nodes without reports_to that aren't PL)
  const plTree = useMemo(() => {
    if (!projectLeadAgentId) return null
    return roots.find((r) => r.agent_id === projectLeadAgentId) ?? null
  }, [roots, projectLeadAgentId])

  const freelancerNodes = useMemo(() => {
    return roots.filter((r) => r.agent_id !== projectLeadAgentId)
  }, [roots, projectLeadAgentId])

  // Handle save from side panel
  const handleSave = useCallback(
    async (roleId: string, data: { title?: string; reports_to?: string | null }) => {
      setIsSaving(true)
      setSaveError(null)
      const result = await updateRole(roleId, data)
      if (!result) {
        setSaveError('Esta relacion crearia un ciclo. Elige un agente diferente.')
      }
      setIsSaving(false)
    },
    [updateRole]
  )

  // Selected node data
  const selectedNode = allNodes.find((n) => n.agent_id === selectedAgentId) ?? null
  const selectedRole = roles.find((r) => r.agent_id === selectedAgentId) ?? null

  // Recursive tree renderer
  function renderTree(node: OrgNode): JSX.Element {
    return (
      <div key={node.agent_id} className="flex flex-col items-center">
        <TeamChartNode
          node={node}
          isProjectLead={node.agent_id === projectLeadAgentId}
          isSelected={node.agent_id === selectedAgentId}
          onSelect={setSelectedAgentId}
        />
        {node.children.length > 0 && (
          <div className="flex flex-col items-center mt-2">
            {/* Vertical connector line down from parent */}
            <div className="w-px h-5 bg-[color:var(--color-border-secondary)]" />
            {/* Children row */}
            <div className="flex flex-row gap-8">
              {node.children.map((child) => (
                <div key={child.agent_id} className="flex flex-col items-center">
                  {/* Vertical connector line up to horizontal bar */}
                  <div className="w-px h-5 bg-[color:var(--color-border-secondary)]" />
                  {renderTree(child)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-primary">
        <TeamChartSkeleton />
      </div>
    )
  }

  // Error state
  if (hookError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-primary">
        <p className="text-sm text-error-primary">{hookError}</p>
      </div>
    )
  }

  // Empty state
  if (roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-primary gap-4">
        <FeaturedIcon icon={<Users01 />} variant="light" size="md" />
        <div className="text-center space-y-1">
          <p className="font-display text-base font-semibold text-primary">No agents assigned</p>
          <p className="text-xs text-tertiary">Add agents to this project to see the team chart.</p>
        </div>
        <Button
          color="secondary"
          size="sm"
          iconLeading={Plus}
          onClick={() => setShowAgentPicker((v) => !v)}
        >
          Assign agent
        </Button>

        {showAgentPicker && unassignedAgents.length > 0 && (
          <div className="w-64 rounded-lg border border-secondary bg-primary p-2 shadow-lg">
            <p className="text-xs text-tertiary px-2 py-1">Select an agent</p>
            {unassignedAgents.map((agent) => (
              <AriaButton
                key={agent.agent_id}
                onPress={() => { setShowAgentPicker(false); setPendingAgent(agent) }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-primary hover:bg-secondary"
              >
                <Avatar src={agent.avatar_url ?? undefined} alt={agent.name} size="xs" />
                {agent.name}
              </AriaButton>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative flex w-full min-h-[400px] bg-primary">
      {/* Main tree content */}
      <div className={cx('flex-1 overflow-auto p-8', 'flex flex-col items-center gap-8')}>
        {/* PL subtree at apex */}
        {plTree && renderTree(plTree)}

        {/* Freelancer section */}
        {freelancerNodes.length > 0 && (
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Divider */}
            <div className="w-full border-t border-secondary" />

            {/* Label */}
            <p className="text-sm text-quaternary">
              Reporta directamente a ti
            </p>

            {/* Freelancer nodes row */}
            <div className="flex flex-row flex-wrap gap-4 justify-center">
              {freelancerNodes.map((node) => (
                <TeamChartNode
                  key={node.agent_id}
                  node={node}
                  isProjectLead={false}
                  isSelected={node.agent_id === selectedAgentId}
                  onSelect={setSelectedAgentId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Assign agent button — shown when there are still unassigned agents */}
        {unassignedAgents.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            <Button
              color="secondary"
              size="sm"
              iconLeading={Plus}
              onClick={() => setShowAgentPicker((v) => !v)}
            >
              Assign agent
            </Button>

            {showAgentPicker && (
              <div className="w-64 rounded-lg border border-secondary bg-primary p-2 shadow-lg">
                <p className="text-xs text-tertiary px-2 py-1">Select an agent</p>
                {unassignedAgents.map((agent) => (
                  <AriaButton
                    key={agent.agent_id}
                    onPress={() => { setShowAgentPicker(false); setPendingAgent(agent) }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-primary hover:bg-secondary"
                  >
                    <Avatar src={agent.avatar_url ?? undefined} alt={agent.name} size="xs" />
                    {agent.name}
                  </AriaButton>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Side panel — rendered when a node is selected */}
      {selectedAgentId && selectedNode && selectedRole && (
        <TeamChartSidePanel
          node={selectedNode}
          roleRow={selectedRole}
          availableAgents={allNodes}
          onSave={handleSave}
          onClose={() => {
            setSelectedAgentId(null)
            setSaveError(null)
          }}
          isSaving={isSaving}
          error={saveError}
        />
      )}

      {/* Confirmation dialog — shown when selecting a non-member agent */}
      {pendingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-overlay" onClick={() => setPendingAgent(null)} />
          <div className="relative rounded-xl border border-secondary bg-primary p-6 shadow-xl max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <Avatar src={pendingAgent.avatar_url ?? undefined} alt={pendingAgent.name} size="md" />
              <div>
                <p className="text-sm font-semibold text-primary">{pendingAgent.name}</p>
                <p className="text-xs text-tertiary">{pendingAgent.role}</p>
              </div>
            </div>
            <p className="text-sm text-secondary">
              {pendingAgent.name} is not a member of this project. Do you want to add them?
            </p>
            <div className="flex justify-end gap-2">
              <Button color="secondary" size="sm" onClick={() => setPendingAgent(null)}>
                Cancel
              </Button>
              <Button color="primary" size="sm" onClick={async () => {
                await handleAssignAgent(pendingAgent.agent_id)
                setPendingAgent(null)
              }}>
                Add to project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
