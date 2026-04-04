'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import officeEvents, { type AgentSelectPayload } from '@/lib/office-events'
import { AgentPanel } from '@/components/application/agent-panel'

const PhaserBridge = dynamic(
  () => import('@/game/phaser-bridge').then(m => m.PhaserBridge),
  { ssr: false, loading: () => (
    <div className="flex flex-1 w-full items-center justify-center">
      <p className="text-sm text-tertiary">Loading office...</p>
    </div>
  )}
)

export default function OfficePage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentSelectPayload | null>(null)

  useEffect(() => {
    const handleSelect = (agent: AgentSelectPayload) => {
      setSelectedAgent(prev =>
        prev?.agent_id === agent.agent_id ? null : agent
      )
    }
    const handleDeselect = () => setSelectedAgent(null)

    officeEvents.on('agent:select', handleSelect)
    officeEvents.on('agent:deselect', handleDeselect)

    return () => {
      officeEvents.off('agent:select', handleSelect)
      officeEvents.off('agent:deselect', handleDeselect)
    }
  }, [])

  return (
    <div className="flex flex-row flex-1 w-full overflow-hidden p-2" style={{ minHeight: 0 }}>
      <div className="flex-1 min-w-0 h-full rounded-3xl overflow-hidden">
        <PhaserBridge />
      </div>

      {selectedAgent && (
        <div className="w-[400px] shrink-0 h-full">
          <AgentPanel
            name={selectedAgent.name}
            role={selectedAgent.role}
            isOnline={
              selectedAgent.status === 'active' || selectedAgent.status === 'working'
            }
          />
        </div>
      )}
    </div>
  )
}
