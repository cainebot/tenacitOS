'use client'

import { useState } from 'react'
import { cx, Button, Tooltip, Grid2x2Plus, Grid2x2Block, Armchair } from '@circos/ui'
import { Hand, Eraser } from '@untitledui/icons'
import { useBuilderStore, type ActiveTool } from '../stores/builder-store'
import { ZoneRequiredModal } from './zone-required-modal'

interface ToolConfig {
  id: ActiveTool
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>
  label: string
}

const TOOLS: ToolConfig[] = [
  { id: 'hand', icon: Hand, label: 'Move around' },
  { id: 'add-zones', icon: Grid2x2Plus, label: 'Create zone' },
  { id: 'blocked', icon: Grid2x2Block, label: 'Block area' },
  { id: 'eraser', icon: Eraser, label: 'Erase tiles' },
  { id: 'seat', icon: Armchair, label: 'Place seat' },
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
      <div className="bg-primary border-r border-primary flex flex-col gap-[4px] px-[10px] py-5 shrink-0">
        {TOOLS.map((tool) => (
          <Tooltip key={tool.id} title={tool.label} placement="right" delay={200}>
            <div
              className={cx(
                'p-[2px] rounded-md',
                activeTool === tool.id && 'bg-brand-primary_alt',
              )}
            >
              <Button
                size="lg"
                color="tertiary"
                iconOnly
                iconLeading={tool.icon}
                aria-label={tool.label}
                onPress={() => handleToolSwitch(tool.id)}
              />
            </div>
          </Tooltip>
        ))}
      </div>

      <ZoneRequiredModal
        isOpen={showZoneRequired}
        onClose={() => setShowZoneRequired(false)}
      />
    </>
  )
}
