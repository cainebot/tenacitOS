'use client'

import { useRouter } from 'next/navigation'
import { Avatar, Badge, BadgeWithDot, Table, TableCard } from '@circos/ui'
import { ChevronRight } from '@untitledui/icons'
import type { AgentRowWithDept } from '@/hooks/useRealtimeAgents'
import { agentStatusColor } from '@/lib/agent-status-color'

interface AgentTableProps {
  agents: AgentRowWithDept[]
}

export function AgentTable({ agents }: AgentTableProps) {
  const router = useRouter()

  return (
    <TableCard.Root size="md" className="w-full">
      <Table aria-label="Agents table" className="w-full">
        <Table.Header>
          <Table.Head id="name" isRowHeader>
            <span className="text-xs font-medium text-quaternary">Name</span>
          </Table.Head>
          <Table.Head id="role">
            <span className="text-xs font-medium text-quaternary">Role</span>
          </Table.Head>
          <Table.Head id="status">
            <span className="text-xs font-medium text-quaternary">Status</span>
          </Table.Head>
          <Table.Head id="node">
            <span className="text-xs font-medium text-quaternary">Node</span>
          </Table.Head>
          <Table.Head id="department">
            <span className="text-xs font-medium text-quaternary">Department</span>
          </Table.Head>
          <Table.Head id="skills">
            <span className="text-xs font-medium text-quaternary">Skills</span>
          </Table.Head>
          <Table.Head id="actions">
            <span className="sr-only">Actions</span>
          </Table.Head>
        </Table.Header>
        <Table.Body>
          {agents.map((agent) => (
            <Table.Row
              key={agent.agent_id}
              className="cursor-pointer"
              onClick={() => router.push(`/agents/${agent.agent_id}`)}
            >
              {/* Name + Avatar */}
              <Table.Cell>
                <div className="flex items-center gap-3">
                  <Avatar
                    size="sm"
                    initials={agent.emoji}
                    status={agent.status === 'offline' ? 'offline' : 'online'}
                  />
                  <span className="text-sm font-medium text-primary">{agent.name}</span>
                </div>
              </Table.Cell>
              {/* Role */}
              <Table.Cell>
                <span className="text-sm text-tertiary">{agent.role ?? '\u2014'}</span>
              </Table.Cell>
              {/* Status */}
              <Table.Cell>
                <BadgeWithDot color={agentStatusColor(agent.status)} size="sm" type="pill-color">
                  {agent.status}
                </BadgeWithDot>
              </Table.Cell>
              {/* Node */}
              <Table.Cell>
                <Badge color="gray" size="sm">{agent.node_id}</Badge>
              </Table.Cell>
              {/* Department */}
              <Table.Cell>
                <span className="text-sm text-tertiary">
                  {agent.departments?.display_name ?? '\u2014'}
                </span>
              </Table.Cell>
              {/* Skills */}
              <Table.Cell>
                <Badge color={(agent.skills?.length ?? 0) > 0 ? 'brand' : 'gray'} size="sm">
                  {agent.skills?.length ?? 0} skills
                </Badge>
              </Table.Cell>
              {/* Chevron */}
              <Table.Cell>
                <ChevronRight className="size-4 text-fg-quaternary" />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </TableCard.Root>
  )
}
