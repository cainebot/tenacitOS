'use client'

import { useEffect } from 'react'
import { useOfficeMap } from '@/features/office/viewer/hooks/use-office-map'
import { useOfficeStore } from '@/features/office/stores/office-store'
import { useBuilderStore } from '@/features/office/builder/stores/builder-store'
import { BuilderLayout } from '@/features/office/builder/components/builder-layout'
import { PUBLISHED_MAP_ID } from '@/features/office/constants'

export default function BuildPage() {
  const { mapDocument } = useOfficeMap()
  const setMapDocument = useOfficeStore((s) => s.setMapDocument)
  const setZones = useBuilderStore((s) => s.setZones)
  const setMapId = useBuilderStore((s) => s.setMapId)

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
    }
  }, [mapDocument, setMapDocument, setZones, setMapId])

  return <BuilderLayout />
}
