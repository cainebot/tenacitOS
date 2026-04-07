'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'motion/react'
import officeEvents, { type AgentSelectPayload } from '@/lib/office-events'
import { AgentPanel } from '@/components/application/agent-panel'
import { MiniMap } from '@/components/application/mini-map'
import { useProjection } from '@/features/office/viewer/hooks/use-projection'
import { useZoneBindings } from '@/features/office/viewer/hooks/use-zone-bindings'
import { useOfficeMap } from '@/features/office/viewer/hooks/use-office-map'
import { useOfficeStore } from '@/features/office/stores/office-store'
import { ZoneBadgeOverlay } from '@/features/office/viewer/components/zone-badge-overlay'

const PhaserBridge = dynamic(
  () => import('@/game/phaser-bridge').then(m => m.PhaserBridge),
  { ssr: false, loading: () => (
    <div className="flex flex-1 w-full items-center justify-center">
      <p className="text-sm text-tertiary">Loading office...</p>
    </div>
  )}
)

export default function OfficePage() {
  // Load zone bindings from Supabase and push to store
  const { zoneBindings } = useZoneBindings()
  const setZoneBindings = useOfficeStore((s) => s.setZoneBindings)

  useEffect(() => {
    setZoneBindings(zoneBindings)
    if (zoneBindings.length > 0) {
      officeEvents.emit('bindings:update', zoneBindings)
    }
  }, [zoneBindings, setZoneBindings])

  // Load map document from Supabase and push to store
  const { mapDocument, loading: mapLoading } = useOfficeMap()
  const setMapDocument = useOfficeStore((s) => s.setMapDocument)
  const setPois = useOfficeStore((s) => s.setPois)

  useEffect(() => {
    if (mapDocument) {
      setMapDocument(mapDocument)
      setPois(mapDocument.pois)
    }
  }, [mapDocument, setMapDocument, setPois])

  // Wire Realtime agent/task data -> ProjectionService -> officeEvents
  // useProjection reads zoneBindings from store — it will guard on empty bindings
  useProjection()

  const [selectedAgent, setSelectedAgent] = useState<AgentSelectPayload | null>(null)
  // Keep last agent visible during close animation
  const [displayAgent, setDisplayAgent] = useState<AgentSelectPayload | null>(null)

  useEffect(() => {
    if (selectedAgent) setDisplayAgent(selectedAgent)
  }, [selectedAgent])

  const handleAnimationComplete = useCallback(() => {
    if (!selectedAgent) setDisplayAgent(null)
  }, [selectedAgent])

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

  // Gate: don't mount Phaser until DB map data is loaded (avoids race condition
  // where OfficeScene reads empty fallback zones before Supabase fetch completes)
  if (mapLoading) {
    return (
      <div className="flex flex-1 w-full items-center justify-center">
        <p className="text-sm text-tertiary">Loading office...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-row flex-1 w-full overflow-hidden p-2" style={{ minHeight: 0 }}>
      <div className="relative flex-1 min-w-0 h-full rounded-3xl overflow-hidden">
        <PhaserBridge />
        <ZoneBadgeOverlay />
        <MiniMap />
      </div>

      <motion.div
        animate={{ width: selectedAgent ? 400 : 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 200, bounce: 0 }}
        onAnimationComplete={handleAnimationComplete}
        className="shrink-0 h-full overflow-hidden"
      >
        {displayAgent && (
          <div className="w-[400px] h-full">
            <AgentPanel
              name={displayAgent.name}
              role={displayAgent.role}
              isOnline={
                displayAgent.status === 'active' || displayAgent.status === 'working'
              }
              onClose={() => setSelectedAgent(null)}
            />
          </div>
        )}
      </motion.div>
    </div>
  )
}
