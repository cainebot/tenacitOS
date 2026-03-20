'use client'

import { useRealtimeStatus } from '@/components/RealtimeProvider'
import type { NodeRow, NodeStatus } from '@/types/supabase'
import { Server, Wifi, WifiOff, HardDrive, Users, Clock, Cpu } from 'lucide-react'

// ── helpers ────────────────────────────────────────────────────────────────

function getRamPercent(node: NodeRow): number {
  if (!node.ram_total_mb || node.ram_total_mb === 0) return 0
  return Math.round((node.ram_usage_mb / node.ram_total_mb) * 100)
}

function getRamBarColor(percent: number): string {
  if (percent > 85) return 'var(--error-600)'
  if (percent > 70) return 'var(--warning-600)'
  return 'var(--success-600)'
}

function getCpuBarColor(percent: number): string {
  if (percent > 90) return 'var(--error-600)'
  if (percent > 70) return 'var(--warning-600)'
  return 'var(--success-600)'
}

function statusColor(status: NodeStatus): string {
  if (status === 'online') return 'var(--success-600)'
  if (status === 'degraded') return 'var(--warning-600)'
  return 'var(--error-600)'
}

function statusLabel(status: NodeStatus): string {
  if (status === 'online') return 'Online'
  if (status === 'degraded') return 'Degraded'
  return 'Offline'
}

function StatusIcon({ status }: { status: NodeStatus }) {
  const color = statusColor(status)
  if (status === 'online') return <Wifi size={14} color={color} />
  if (status === 'degraded') return <Wifi size={14} color={color} />
  return <WifiOff size={14} color={color} />
}

function relativeTime(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  return `${diffHr}h ago`
}

// ── NodeCard ───────────────────────────────────────────────────────────────

interface NodeCardProps {
  node: NodeRow
  agentNames: string[]
}

function NodeCard({ node, agentNames }: NodeCardProps) {
  const ramPercent = getRamPercent(node)
  const barColor = getRamBarColor(ramPercent)
  const cpuPercent = Math.round(node.cpu_percent ?? 0)
  const cpuBarColor = getCpuBarColor(cpuPercent)
  const color = statusColor(node.status)

  return (
    <div className="bg-secondary border border-primary rounded-xl p-5 flex flex-col gap-4">
      {/* Header: node ID + status badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Server size={18} color='var(--text-primary-900)' className="shrink-0" />
          <span
            className="text-[15px] font-bold text-primary overflow-hidden text-ellipsis whitespace-nowrap"
            title={node.node_id}
          >
            {node.node_id}
          </span>
        </div>
        <div
          style={{
            background: `${color}22`,
            border: `1px solid ${color}55`,
          }}
          className="flex items-center gap-[5px] px-[10px] py-[3px] rounded-full shrink-0"
        >
          <StatusIcon status={node.status} />
          <span style={{ color }} className="text-[12px] font-semibold">{statusLabel(node.status)}</span>
        </div>
      </div>

      {/* Tailscale IP */}
      <p className="m-0 text-[12px] text-secondary">
        {node.tailscale_ip}:{node.gateway_port}
      </p>

      {/* RAM usage */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <HardDrive size={13} color='var(--text-secondary-700)' />
            <span className="text-[12px] text-secondary">RAM</span>
          </div>
          <span className="text-[12px] text-primary">
            {node.ram_usage_mb} MB / {node.ram_total_mb} MB ({ramPercent}%)
          </span>
        </div>
        <div className="w-full h-[6px] bg-gray-300 rounded-[3px] overflow-hidden">
          <div
            style={{
              width: `${ramPercent}%`,
              background: barColor,
              transition: 'width 0.4s ease',
            }}
            className="h-full rounded-[3px]"
          />
        </div>
      </div>

      {/* CPU usage */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Cpu size={13} color='var(--text-secondary-700)' />
            <span className="text-[12px] text-secondary">CPU</span>
          </div>
          <span className="text-[12px] text-primary">
            {cpuPercent}%
          </span>
        </div>
        <div className="w-full h-[6px] bg-gray-300 rounded-[3px] overflow-hidden">
          <div
            style={{
              width: `${cpuPercent}%`,
              background: cpuBarColor,
              transition: 'width 0.4s ease',
            }}
            className="h-full rounded-[3px]"
          />
        </div>
      </div>

      {/* Agents */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Users size={13} color='var(--text-secondary-700)' />
          <span className="text-[12px] text-secondary">
            {node.agent_count} agent{node.agent_count !== 1 ? 's' : ''}
          </span>
        </div>
        {agentNames.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agentNames.map((name) => (
              <span
                key={name}
                className="text-[11px] px-2 py-0.5 bg-gray-300 rounded text-primary"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Last heartbeat */}
      <div className="flex items-center gap-1.5">
        <Clock size={13} color='var(--text-secondary-700)' />
        <span className="text-[12px] text-secondary">
          Last heartbeat: {relativeTime(node.last_heartbeat)}
        </span>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

// ── AggregateSummary ───────────────────────────────────────────────────────

interface SummaryStatProps {
  label: string
  value: number | string
}

function SummaryStat({ label, value }: SummaryStatProps) {
  return (
    <div className="flex flex-col items-center gap-1 px-5 py-3 bg-secondary border border-primary rounded-[10px] min-w-[80px]">
      <span className="text-[22px] font-bold text-primary">
        {value}
      </span>
      <span className="text-[11px] text-secondary uppercase tracking-[0.06em]">
        {label}
      </span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function NodesPage() {
  const { connectionStatus, nodes, agents, nodesLoading } = useRealtimeStatus()
  const isDisconnected = connectionStatus === 'disconnected'

  // Aggregate summary stats
  const totalNodes = nodes.length
  const onlineNodes = nodes.filter((n) => n.status === 'online').length
  const degradedNodes = nodes.filter((n) => n.status === 'degraded').length
  const totalAgents = nodes.reduce((sum, n) => sum + (n.agent_count ?? 0), 0)

  return (
    <div className="max-w-[1400px]">
      {/* Disconnection banner */}
      {isDisconnected && (
        <div className="mb-5 px-4 py-[10px] bg-warning-600/10 border border-warning-600 rounded-lg flex items-center gap-2 text-warning-600 text-[13px]">
          <WifiOff size={16} />
          Connection lost — showing stale data. Attempting to reconnect…
        </div>
      )}

      {/* Page header */}
      <div className="mb-7 flex items-center gap-3">
        <h1 className="m-0 text-[26px] font-bold text-primary">
          Workspaces
        </h1>
        {!nodesLoading && (
          <span className="text-[13px] px-[10px] py-[3px] bg-gray-300 rounded-full text-secondary">
            {nodes.length} registered
          </span>
        )}
      </div>

      {/* Aggregate summary strip */}
      {!nodesLoading && nodes.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <SummaryStat label="Nodes" value={totalNodes} />
          <SummaryStat label="Online" value={onlineNodes} />
          <SummaryStat label="Agents" value={totalAgents} />
          <SummaryStat label="Degraded" value={degradedNodes} />
        </div>
      )}

      {/* Loading state */}
      {nodesLoading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[220px] bg-secondary border border-primary rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!nodesLoading && nodes.length === 0 && (
        <div className="text-center px-6 py-16 text-secondary">
          <Server size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p className="m-0 mb-2 text-base font-semibold">No nodes registered yet</p>
          <p className="m-0 text-[13px]">
            Run <code className="px-1.5 py-0.5 bg-gray-300 rounded">register-node.sh</code> on a machine to get started.
          </p>
        </div>
      )}

      {/* Node cards grid */}
      {!nodesLoading && nodes.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {nodes.map((node) => {
            const agentNames = agents
              .filter((a) => a.node_id === node.node_id)
              .map((a) => `${a.emoji} ${a.name}`)
            return <NodeCard key={node.node_id} node={node} agentNames={agentNames} />
          })}
        </div>
      )}
    </div>
  )
}
