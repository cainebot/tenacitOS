'use client'

import { useState } from 'react'
import { cx, Button } from '@circos/ui'
import {
  Hand,          // Hand/Pan tool
  PlusSquare,    // Add Zones tool
  SlashCircle01, // Blocked Zones tool
  Eraser,        // Eraser tool
  Cursor01,      // Seat tool (substitute — Armchair not in @untitledui/icons)
} from '@untitledui/icons'
import { useBuilderStore, type ActiveTool } from '../stores/builder-store'
import { ZoneRequiredModal } from './zone-required-modal'

interface ToolConfig {
  id: ActiveTool
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>
  label: string
}

const TOOLS: ToolConfig[] = [
  { id: 'hand', icon: Hand, label: 'Pan/Hand' },
  { id: 'add-zones', icon: PlusSquare, label: 'Add Zones' },
  { id: 'blocked', icon: SlashCircle01, label: 'Blocked Zones' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'seat', icon: Cursor01, label: 'Seat' },
]

export function BuilderToolbar() {
  const activeTool = useBuilderStore((s) => s.activeTool)
  const setActiveTool = useBuilderStore((s) => s.setActiveTool)
  const [showZoneRequired, setShowZoneRequired] = useState(false)

  const handleToolSwitch = (tool: ActiveTool) => {
    // Gate: switching to add-zones or seat requires a zone to be selected
    const { selectedZoneId } = useBuilderStore.getState()
    if ((tool === 'add-zones' || tool === 'seat') && !selectedZoneId) {
      setShowZoneRequired(true)
      return
    }
    setActiveTool(tool)
  }

  return (
    <>
      <div className="w-[56px] bg-primary border-r border-primary flex flex-col gap-[4px] px-2 py-5 shrink-0">
        {TOOLS.map((tool) => (
          <div
            key={tool.id}
            className={cx(
              'p-[2px] rounded-md',
              activeTool === tool.id && 'bg-brand-primary_alt',
            )}
          >
            <Button
              color="tertiary"
              iconLeading={tool.icon}
              aria-label={tool.label}
              onClick={() => handleToolSwitch(tool.id)}
            />
          </div>
        ))}
      </div>

      <ZoneRequiredModal
        isOpen={showZoneRequired}
        onClose={() => setShowZoneRequired(false)}
      />
    </>
  )
}
