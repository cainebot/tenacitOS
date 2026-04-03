'use client'

import Link from 'next/link'
import { Avatar, Badge, BadgeWithDot, cx } from '@circos/ui'
import type { AgentRowWithDept } from '@/hooks/useRealtimeAgents'
import { agentStatusColor } from '@/lib/agent-status-color'

interface AgentCardProps {
  agent: AgentRowWithDept
}

export function AgentCard({ agent }: AgentCardProps) {
  const skillsCount = agent.skills?.length ?? 0
  const deptName = agent.departments?.display_name

  return (
    <Link
      href={`/agents/${agent.agent_id}`}
      className={cx(
        'relative block rounded-xl border border-secondary bg-secondary p-4',
        'transition duration-100 ease-linear',
        'hover:bg-secondary_hover hover:border-primary cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2'
      )}
    >
      {/* Status badge -- absolute top-right per UI-SPEC locked decision */}
      <div className="absolute top-3 right-3">
        <BadgeWithDot color={agentStatusColor(agent.status)} size="sm" type="pill-color">
          {agent.status}
        </BadgeWithDot>
      </div>

      {/* Avatar -- emoji via initials fallback; status mapped to binary online/offline */}
      <Avatar
        size="md"
        initials={agent.emoji}
        status={agent.status === 'offline' ? 'offline' : 'online'}
      />

      {/* Name + Role */}
      <p className="mt-2 text-[16px] font-[600] text-primary">{agent.name}</p>
      <p className="text-[14px] text-tertiary">{agent.role ?? '\u2014'}</p>

      {/* Metadata badges: node, department, skills */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge color="gray" size="sm">{agent.node_id}</Badge>
        {deptName && (
          <Badge color="gray" size="sm">{deptName}</Badge>
        )}
        <Badge color={skillsCount > 0 ? 'brand' : 'gray'} size="sm">
          {skillsCount} skills
        </Badge>
      </div>
    </Link>
  )
}
