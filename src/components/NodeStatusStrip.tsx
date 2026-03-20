'use client'

import { useEffect, useRef, useState } from 'react'
import { useRealtimeStatus } from '@/components/RealtimeProvider'
import type { NodeRow, NodeStatus } from '@/types/supabase'
import { cx } from '@openclaw/ui'

// ---------- Notification types ----------

interface NodeNotification {
  id: number
  nodeId: string
  message: string
  type: 'offline' | 'online'
}

let notifCounter = 0

function getRamPercent(node: NodeRow): number {
  if (!node.ram_total_mb || node.ram_total_mb === 0) return 0
  return Math.round((node.ram_usage_mb / node.ram_total_mb) * 100)
}

function getRamBarColor(percent: number): string {
  if (percent > 85) return 'bg-error-600'
  if (percent > 70) return 'bg-warning-600'
  return 'bg-success-600'
}

function statusDotColor(status: NodeStatus): string {
  if (status === 'online') return 'bg-success-600'
  if (status === 'degraded') return 'bg-warning-600'
  return 'bg-error-600'
}

function StatusIcon({ status }: { status: NodeStatus }) {
  if (status === 'online') {
    return (
      <span className="text-[10px] font-bold text-success-600">
        ✓
      </span>
    )
  }
  if (status === 'degraded') {
    return (
      <span className="text-[10px] font-bold text-warning-600">
        ⚠
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold text-error-600">
      ✕
    </span>
  )
}

function NodeCard({ node }: { node: NodeRow }) {
  const ramPercent = getRamPercent(node)
  const shortId = node.node_id.length > 12 ? node.node_id.slice(0, 12) + '…' : node.node_id

  return (
    <div className="flex flex-col gap-1 px-2.5 py-1.5 bg-secondary border border-primary rounded-md min-w-[120px] shrink-0">
      {/* Node ID + status */}
      <div className="flex items-center gap-1.5">
        <span className={cx("inline-block w-2 h-2 rounded-full shrink-0", statusDotColor(node.status))} />
        <StatusIcon status={node.status} />
        <span
          className="text-[11px] font-semibold text-primary overflow-hidden text-ellipsis whitespace-nowrap"
          title={node.node_id}
        >
          {shortId}
        </span>
      </div>

      {/* RAM bar */}
      <div className="w-full h-[3px] bg-gray-300 rounded-sm overflow-hidden">
        <div
          className={cx("h-full rounded-sm transition-[width] duration-[400ms] ease-in-out", getRamBarColor(ramPercent))}
          style={{ width: `${ramPercent}%` }}
        />
      </div>

      {/* Agent count */}
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-secondary">
          {ramPercent}% RAM
        </span>
        <span className="text-[10px] bg-gray-300 rounded px-1.5 py-px text-primary">
          {node.agent_count} agent{node.agent_count !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-1.5 px-2.5 py-1.5 bg-secondary border border-primary rounded-md min-w-[120px] shrink-0">
      <div className="h-3 w-4/5 bg-white/[0.08] rounded animate-pulse" />
      <div className="h-[3px] w-full bg-white/[0.08] rounded-sm animate-pulse" />
      <div className="h-2.5 w-3/5 bg-white/[0.08] rounded animate-pulse" />
    </div>
  )
}

export default function NodeStatusStrip() {
  const { connectionStatus, nodes, nodesLoading } = useRealtimeStatus()
  const isDisconnected = connectionStatus === 'disconnected'
  const [notifications, setNotifications] = useState<NodeNotification[]>([])
  const prevStatusRef = useRef<Map<string, NodeStatus>>(new Map())

  // Detect node status transitions and fire notifications
  useEffect(() => {
    const prev = prevStatusRef.current
    const next = new Map<string, NodeStatus>()

    for (const node of nodes) {
      next.set(node.node_id, node.status)
      const prevStatus = prev.get(node.node_id)
      if (prevStatus !== undefined && prevStatus !== node.status) {
        if (node.status === 'offline') {
          const id = ++notifCounter
          const notif: NodeNotification = {
            id,
            nodeId: node.node_id,
            message: `${node.node_id.slice(0, 12)} went offline`,
            type: 'offline',
          }
          setNotifications((prev) => [...prev, notif])
          setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id))
          }, 8000)
        } else if (prevStatus === 'offline' && (node.status === 'online' || node.status === 'degraded')) {
          const id = ++notifCounter
          const notif: NodeNotification = {
            id,
            nodeId: node.node_id,
            message: `${node.node_id.slice(0, 12)} is back online`,
            type: 'online',
          }
          setNotifications((prev) => [...prev, notif])
          setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id))
          }, 8000)
        }
      }
    }

    prevStatusRef.current = next
  }, [nodes])

  const dismissNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Disconnection banner */}
      {isDisconnected && (
        <div className="bg-warning-600/15 border border-warning-600 rounded px-2.5 py-1 text-[11px] text-warning-600 text-center">
          Connection lost — data may be stale
        </div>
      )}

      {/* Node cards strip */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {nodesLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : nodes.length === 0 ? (
          <span className="text-[11px] text-secondary py-1.5">
            No nodes registered
          </span>
        ) : (
          nodes.map((node) => <NodeCard key={node.node_id} node={node} />)
        )}
      </div>

      {/* Node transition notifications */}
      {notifications.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={cx(
                "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-[11px] font-medium animate-[fadeIn_0.2s_ease]",
                notif.type === 'offline'
                  ? "bg-error-600/[0.12] border border-error-600 text-error-600"
                  : "bg-success-600/[0.12] border border-success-600 text-success-600"
              )}
            >
              <span>{notif.message}</span>
              <button
                onClick={() => dismissNotification(notif.id)}
                className="bg-transparent border-none cursor-pointer text-inherit text-xs leading-none px-0.5 opacity-70 shrink-0"
                aria-label="Dismiss"
              >
                &#x2715;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
