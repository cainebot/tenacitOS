'use client'

import { useEffect } from 'react'
import { useOfficeMap } from '@/features/office/viewer/hooks/use-office-map'
import { useOfficeStore } from '@/features/office/stores/office-store'
import { useBuilderStore } from '@/features/office/builder/stores/builder-store'
import { BuilderLayout } from '@/features/office/builder/components/builder-layout'
import { PUBLISHED_MAP_ID } from '@/features/office/constants'

export default function BuildPage() {
  const { mapDocument, versionNum, loading } = useOfficeMap()
  const setMapDocument = useOfficeStore((s) => s.setMapDocument)
  const setZones = useBuilderStore((s) => s.setZones)
  const setMapId = useBuilderStore((s) => s.setMapId)
  const setCurrentVersionNum = useBuilderStore((s) => s.setCurrentVersionNum)

  useEffect(() => {
    if (mapDocument) {
      setMapDocument(mapDocument)
      // Seed builder zones from loaded map document with defaults for new fields
      const zonesWithDefaults = (mapDocument.zones || []).map((z, i) => ({
        ...z,
        displayOrder: z.displayOrder ?? i + 1,
        agentRestricted: z.agentRestricted ?? false,
        seats: z.seats ?? [],
      }))
      setZones(zonesWithDefaults)
      setMapId(PUBLISHED_MAP_ID)
      setCurrentVersionNum(versionNum)
      // Reset dirty flag — freshly loaded data is clean
      useBuilderStore.getState().markClean()
    }
  }, [mapDocument, versionNum, setMapDocument, setZones, setMapId, setCurrentVersionNum])

  // Gate: don't render builder until DB data is loaded
  // Prevents race condition where Phaser reads empty store before fetch completes
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-sm text-tertiary">Loading map data...</p>
      </div>
    )
  }

  return <BuilderLayout />
}
