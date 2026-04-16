'use client'

import { useState, useEffect, useMemo } from 'react'
import { Save01, Trash03, XClose } from '@untitledui/icons'
import { Button, Input, Select, Toggle } from '@circos/ui'
import { useBuilderStore } from '@/features/office/builder/stores/builder-store'
import { useZoneBindingsWrite } from '../hooks/use-zone-bindings-write'
import { useBuilderSave } from '../hooks/use-builder-save'
import { DeleteZoneModal } from './delete-zone-modal'
import { UnsavedChangesModal } from './unsaved-changes-modal'
import { ROOM_CAPABILITIES } from '@/features/office/constants'

interface ZonePropertiesProps {
  zoneId: string
  onClose: () => void
}

export function ZoneProperties({ zoneId, onClose }: ZonePropertiesProps) {
  const zone = useBuilderStore((s) => s.zones.find((z) => z.id === zoneId))
  const dirty = useBuilderStore((s) => s.dirty)
  const updateZone = useBuilderStore((s) => s.updateZone)
  const deleteZone = useBuilderStore((s) => s.deleteZone)

  const { binding, agents, projects, boards, allBindings, updateBinding } = useZoneBindingsWrite(zoneId)
  const { saveDraft, saving } = useBuilderSave()

  const [showDelete, setShowDelete] = useState(false)
  const [showUnsaved, setShowUnsaved] = useState(false)

  const [zoneType, setZoneType] = useState<'desk' | 'office' | 'room'>(
    binding?.zone_type ?? 'desk'
  )

  // Sync zoneType when binding loads asynchronously
  useEffect(() => {
    if (binding?.zone_type) setZoneType(binding.zone_type)
  }, [binding?.zone_type])

  // Client-side uniqueness validation (per CONTEXT.md locked decision)
  const uniquenessWarning = useMemo(() => {
    if (!binding) return null

    if (zoneType === 'desk' && binding.agent_id) {
      const duplicate = allBindings.find(
        (b) => b.zone_id !== binding.zone_id && b.zone_type === 'desk' && b.agent_id === binding.agent_id
      )
      if (duplicate) {
        const agentName = agents.find(a => a.id === binding.agent_id)?.name ?? binding.agent_id
        return `Agent "${agentName}" is already assigned to another desk`
      }
    }

    if (zoneType === 'office' && binding.board_id) {
      const duplicate = allBindings.find(
        (b) => b.zone_id !== binding.zone_id && b.zone_type === 'office' && b.board_id === binding.board_id
      )
      if (duplicate) {
        const boardName = boards.find(b => b.id === binding.board_id)?.name ?? binding.board_id
        return `Board "${boardName}" is already assigned to another office`
      }
    }

    return null
  }, [zoneType, binding, allBindings, agents, boards])

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

  // Build board items: "None" first, then real boards
  const boardItems = [
    { id: '', label: 'None' },
    ...boards.map((b) => ({ id: b.id, label: b.name })),
  ]

  // Build room capability items from registry
  const capabilityItems = Object.entries(ROOM_CAPABILITIES).map(([key, val]) => ({
    id: key,
    label: val.label,
  }))

  // Zone type selector items
  const zoneTypeItems = [
    { id: 'desk',   label: 'Desk' },
    { id: 'office', label: 'Office' },
    { id: 'room',   label: 'Room' },
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
          label="Zone Type"
          size="md"
          selectedKey={zoneType}
          onSelectionChange={(key) => {
            const newType = String(key) as 'desk' | 'office' | 'room'
            setZoneType(newType)
            updateBinding('zone_type', newType)
          }}
          items={zoneTypeItems}
        >
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>

        {/* Conditional fields by zone type */}
        {zoneType === 'desk' && (
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
        )}

        {zoneType === 'office' && (
          <>
            <Select
              label="Board"
              size="md"
              placeholder="Select board"
              isRequired
              selectedKey={binding?.board_id ?? ''}
              onSelectionChange={(key) => updateBinding('board_id', key === '' ? null : String(key))}
              items={boardItems}
            >
              {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>
            {/* Project as read-only metadata — derived from selected board */}
            {binding?.board_id && (() => {
              const selectedBoard = boards.find(b => b.id === binding.board_id)
              const projectName = selectedBoard?.project_id
                ? projects.find(p => p.id === selectedBoard.project_id)?.name
                : null
              return projectName ? (
                <Input
                  label="Project"
                  size="md"
                  value={projectName}
                  isReadOnly
                />
              ) : null
            })()}
          </>
        )}

        {zoneType === 'room' && (
          <Select
            label="Room Capability"
            size="md"
            placeholder="Select capability"
            isRequired
            selectedKey={binding?.room_capability ?? ''}
            onSelectionChange={(key) => updateBinding('room_capability', key === '' ? null : String(key))}
            items={capabilityItems}
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        )}

        {/* Uniqueness validation warning */}
        {uniquenessWarning && (
          <p className="text-sm text-error-primary">{uniquenessWarning}</p>
        )}

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
