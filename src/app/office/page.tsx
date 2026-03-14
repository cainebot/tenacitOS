'use client'

import { useCallback, useEffect, useState } from 'react'
import { RealtimeProvider, useRealtimeStatus } from '@/components/RealtimeProvider'
import { eventBridge } from '@/components/Office2D/EventBridge'
import AgentPanel from '@/components/Office2D/AgentPanel'
import type { AgentRow } from '@/types/supabase'
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

// ---------- Office content (inside RealtimeProvider) ----------

function OfficeContent() {
  const { agents } = useRealtimeStatus()
  const [selectedAgent, setSelectedAgent] = useState<AgentRow | null>(null)
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null)

  const closePanel = useCallback(() => {
    setSelectedAgent(null)
    setPanelPosition(null)
  }, [])

  // Subscribe to EventBridge events from Phaser
  useEffect(() => {
    const unsubClick = eventBridge.on('agent-clicked', ({ agentId, x, y }) => {
      const agent = agents.find((a) => a.agent_id === agentId)
      if (agent) {
        setSelectedAgent(agent)
        setPanelPosition({ x, y })
      }
    })

    const unsubApproach = eventBridge.on('agent-approached', ({ agentId }) => {
      const agent = agents.find((a) => a.agent_id === agentId)
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

  return (
    <>
      <PhaserGame />
      <ConnectionIndicator />
      {selectedAgent && panelPosition && (
        <AgentPanel
          agent={selectedAgent}
          position={panelPosition}
          onClose={closePanel}
        />
      )}
    </>
  )
}

// ---------- Page ----------

export default function OfficePage() {
  return (
    <RealtimeProvider>
      <div style={{ width: '100%', height: 'calc(100vh - 80px)', position: 'relative' }}>
        <OfficeContent />
      </div>
    </RealtimeProvider>
  )
}
