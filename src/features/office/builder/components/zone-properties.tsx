'use client'

import { useState } from 'react'
import { Save01, Trash03, XClose } from '@untitledui/icons'
import { Button, Input, Select, Toggle } from '@circos/ui'
import { useBuilderStore } from '@/features/office/builder/stores/builder-store'
import { useZoneBindingsWrite } from '../hooks/use-zone-bindings-write'
import { useBuilderSave } from '../hooks/use-builder-save'
import { DeleteZoneModal } from './delete-zone-modal'
import { UnsavedChangesModal } from './unsaved-changes-modal'

interface ZonePropertiesProps {
  zoneId: string
  onClose: () => void
}

export function ZoneProperties({ zoneId, onClose }: ZonePropertiesProps) {
  const zone = useBuilderStore((s) => s.zones.find((z) => z.id === zoneId))
  const dirty = useBuilderStore((s) => s.dirty)
  const updateZone = useBuilderStore((s) => s.updateZone)
  const deleteZone = useBuilderStore((s) => s.deleteZone)

  const { binding, agents, projects, updateBinding } = useZoneBindingsWrite(zoneId)
  const { saveDraft, saving } = useBuilderSave()

  const [showDelete, setShowDelete] = useState(false)
  const [showUnsaved, setShowUnsaved] = useState(false)

  if (!zone) return null

  const handleClose = () => {
    if (dirty) {
      setShowUnsaved(true)
    } else {
      onClose()
    }
  }

  const handleSave = async () => {
    const { zones } = useBuilderStore.getState()
    await saveDraft({ zones } as never)
    onClose()
  }

  const handleDelete = () => {
    // Clear painted cells from Phaser grid before removing zone from store
    const grid = (globalThis as any).__circos_builder_grid
    if (grid) grid.clearZoneCells(zoneId)
    deleteZone(zoneId)
    onClose()
  }

  // Build agent items: "Anyone" first, then real agents
  const agentItems = [
    { id: '', label: 'Anyone' },
    ...agents.map((a) => ({ id: a.id, label: a.name })),
  ]

  // Build project items: "None" first, then real projects
  const projectItems = [
    { id: '', label: 'None' },
    ...projects.map((p) => ({ id: p.id, label: p.name })),
  ]

  return (
    <div className="flex flex-col h-full bg-secondary">
      {/* Section header — bg-primary, border-b, p-4 per Figma */}
      <div className="bg-primary border-b border-primary p-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-primary">Zones Properties</h3>
            <p className="text-sm text-tertiary truncate">{zone.label}</p>
          </div>
          <Button
            color="tertiary"
            size="sm"
            iconLeading={XClose}
            onClick={handleClose}
            aria-label="Close zone properties"
          />
        </div>
      </div>

      {/* Form fields — gap-2 (8px) per Figma */}
      <div className="flex flex-col gap-2 p-4 flex-1 overflow-y-auto">
        <Input
          label="Zone Label"
          size="md"
          value={zone.label}
          onChange={(val) => updateZone(zoneId, { label: val })}
          placeholder="Enter zone name"
          isRequired
        />

        <Select
          label="Assigned Agent"
          size="md"
          placeholder="Anyone"
          isRequired
          selectedKey={binding?.agent_id ?? ''}
          onSelectionChange={(key) => updateBinding('agent_id', key === '' ? null : String(key))}
          items={agentItems}
        >
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>

        <Select
          label="Assigned Project"
          size="md"
          placeholder="None"
          isRequired
          selectedKey={binding?.project_id ?? ''}
          onSelectionChange={(key) => updateBinding('project_id', key === '' ? null : String(key))}
          items={projectItems}
        >
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>

        {/* Agent Restricted Area — py-4 (16px), text-sm/medium, text-secondary per Figma */}
        <div className="flex items-center justify-between py-4">
          <span className="text-sm font-medium text-secondary">Agent Restricted Area</span>
          <Toggle
            size="md"
            isSelected={zone.agentRestricted ?? false}
            onChange={(val) => updateZone(zoneId, { agentRestricted: val })}
          />
        </div>

        {/* Action buttons — inline in form per Figma */}
        <div className="flex flex-col gap-2">
          <Button
            color="primary"
            size="md"
            iconLeading={Save01}
            onClick={handleSave}
            isLoading={saving}
            className="w-full"
          >
            Save
          </Button>
          <Button
            color="tertiary-destructive"
            size="md"
            iconLeading={Trash03}
            onClick={() => setShowDelete(true)}
            className="w-full"
          >
            Delete Zone
          </Button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <DeleteZoneModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        zoneName={zone.label}
      />

      {/* Unsaved changes modal — shown when closing with dirty state */}
      <UnsavedChangesModal
        isOpen={showUnsaved}
        onClose={() => setShowUnsaved(false)}
        onDiscard={() => {
          setShowUnsaved(false)
          onClose()
        }}
        onSave={async () => {
          await handleSave()
          setShowUnsaved(false)
          onClose()
        }}
        isSaving={saving}
      />
    </div>
  )
}
