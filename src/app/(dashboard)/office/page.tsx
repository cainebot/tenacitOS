'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RealtimeProvider, useRealtimeStatus } from '@/components/RealtimeProvider'
import { eventBridge } from '@/components/Office2D/EventBridge'
import AgentPanel from '@/components/Office2D/AgentPanel'
import type { AgentRow, TaskRow } from '@/types/supabase'
import type { ConnectionStatus } from '@/components/RealtimeProvider'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Phaser (accesses window)
const PhaserGame = dynamic(
  () => import('@/components/Office2D/PhaserGame').then(mod => ({ default: mod.default })),
  { ssr: false, loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-primary)' }}>Loading office...</div> }
)

// ---------- Connection indicator ----------

const CONNECTION_COLORS: Record<ConnectionStatus, string> = {
  connected: '#22c55e',
  connecting: '#eab308',
  disconnected: '#ef4444',
}

const CONNECTION_LABELS: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Disconnected',
}

function ConnectionIndicator() {
  const { connectionStatus } = useRealtimeStatus()
  const color = CONNECTION_COLORS[connectionStatus]
  const label = CONNECTION_LABELS[connectionStatus]

  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(0,0,0,0.6)',
        padding: '4px 10px',
        borderRadius: '12px',
        zIndex: 900,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '12px',
        color: '#e5e7eb',
      }}
      title={label}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 4px ${color}`,
        }}
      />
      <span>{label}</span>
    </div>
  )
}

// ---------- Toast system ----------

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

const TOAST_BORDER_COLORS: Record<ToastType, string> = {
  success: '#22c55e',
  error: '#ef4444',
  info: '#3b82f6',
}

let toastCounter = 0

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: '#1f2937',
            color: '#e5e7eb',
            borderRadius: '8px',
            padding: '12px 16px',
            minWidth: '280px',
            borderLeft: `4px solid ${TOAST_BORDER_COLORS[toast.type]}`,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}

// ---------- Office content (inside RealtimeProvider) ----------

function OfficeContent() {
  const { agents, tasks, nodes } = useRealtimeStatus()
  const [selectedAgent, setSelectedAgent] = useState<AgentRow | null>(null)
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const prevTasksRef = useRef<TaskRow[]>([])

  const closePanel = useCallback(() => {
    setSelectedAgent(null)
    setPanelPosition(null)
  }, [])

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = ++toastCounter
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  // Subscribe to EventBridge events from Phaser
  useEffect(() => {
    const unsubClick = eventBridge.on('agent-clicked', ({ agentId, x, y, fallbackAgent }) => {
      const agent = agents.find((a) => a.agent_id === agentId) ?? fallbackAgent
      if (agent) {
        setSelectedAgent(agent)
        setPanelPosition({ x, y })
      }
    })

    const unsubApproach = eventBridge.on('agent-approached', ({ agentId, fallbackAgent }) => {
      const agent = agents.find((a) => a.agent_id === agentId) ?? fallbackAgent
      if (agent) {
        setSelectedAgent(agent)
        // Center panel on screen for approach interaction
        setPanelPosition({
          x: typeof window !== 'undefined' ? window.innerWidth / 2 - 160 : 400,
          y: typeof window !== 'undefined' ? window.innerHeight / 2 - 180 : 300,
        })
      }
    })

    return () => {
      unsubClick()
      unsubApproach()
    }
  }, [agents])

  // Close panel on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closePanel])

  // Keep selectedAgent in sync with latest agent data (live updates)
  // If agent disappears from array, keep panel open but mark offline
  useEffect(() => {
    if (!selectedAgent) return
    const updated = agents.find((a) => a.agent_id === selectedAgent.agent_id)
    if (updated) {
      // Update with fresh data without closing panel
      setSelectedAgent(updated)
    }
    // If agent not found, keep panel open with stale data (status shows offline by default)
  }, [agents]) // eslint-disable-line react-hooks/exhaustive-deps

  // Diff tasks for toast notifications and EventBridge task events
  useEffect(() => {
    const prev = prevTasksRef.current
    for (const task of tasks) {
      const oldTask = prev.find((t) => t.task_id === task.task_id)
      if (oldTask && oldTask.status !== task.status) {
        if (task.status === 'completed') {
          showToast(`Task "${task.title}" completed`, 'success')
          eventBridge.emit('task-completed', {
            taskId: task.task_id,
            agentId: task.target_agent_id || '',
            title: task.title,
          })
        } else if (task.status === 'failed') {
          showToast(`Task "${task.title}" failed`, 'error')
          eventBridge.emit('task-failed', {
            taskId: task.task_id,
            agentId: task.target_agent_id || '',
            title: task.title,
          })
        } else if (task.status === 'claimed' || task.status === 'in_progress') {
          eventBridge.emit('task-assigned', {
            taskId: task.task_id,
            agentId: task.target_agent_id || '',
            title: task.title,
          })
        }
      }
      // Detect transfer: target_agent_id changed on an existing task
      if (
        oldTask &&
        oldTask.target_agent_id &&
        task.target_agent_id &&
        oldTask.target_agent_id !== task.target_agent_id
      ) {
        eventBridge.emit('task-transferred', {
          taskId: task.task_id,
          fromAgentId: oldTask.target_agent_id,
          toAgentId: task.target_agent_id,
          title: task.title,
        })
        showToast(`Task "${task.title}" transferred`, 'info')
      }
    }
    prevTasksRef.current = tasks
  }, [tasks, showToast])

  const agentTasks = selectedAgent
    ? tasks.filter((t) => t.target_agent_id === selectedAgent.agent_id)
    : []

  return (
    <>
      <PhaserGame />
      <ConnectionIndicator />
      {selectedAgent && panelPosition && (
        <AgentPanel
          agent={selectedAgent}
          tasks={agentTasks}
          position={panelPosition}
          onClose={closePanel}
          nodes={nodes}
        />
      )}
      <ToastContainer toasts={toasts} />
    </>
  )
}

// ---------- Page ----------
// NOTE: This page is inside (dashboard) route group, so DashboardSidebar is provided by the layout.
// The -m-6 class negates the layout's p-6 padding so the Phaser canvas fills edge-to-edge.

export default function OfficePage() {
  return (
    <RealtimeProvider>
      <div className="flex-1 -m-6" style={{ position: 'relative', padding: 0 }}>
        <OfficeContent />
      </div>
    </RealtimeProvider>
  )
}
