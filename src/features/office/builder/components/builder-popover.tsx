'use client'

import { InfoCircle } from '@untitledui/icons'
import { useBuilderStore } from '../stores/builder-store'

export function BuilderPopover() {
  const activeTool = useBuilderStore((s) => s.activeTool)
  const selectedZoneId = useBuilderStore((s) => s.selectedZoneId)
  const zones = useBuilderStore((s) => s.zones)
  const selectedZone = zones.find((z) => z.id === selectedZoneId)

  // Only show when zone selected AND Add Zones (or Seat) tool active
  const show = selectedZone && (activeTool === 'add-zones' || activeTool === 'seat')
  if (!show) return null

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <div className="flex items-center gap-2 bg-primary rounded-md shadow-sm border border-primary px-3 py-2">
        <InfoCircle className="size-4 fg-tertiary shrink-0" />
        <p className="text-sm text-secondary whitespace-nowrap">
          Estas editando/creando &apos;{selectedZone.label}&apos;
        </p>
      </div>
    </div>
  )
}
