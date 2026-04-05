'use client'

import { useState } from 'react'
import { Trash03 } from '@untitledui/icons'
import { Button, Input, Select, Toggle, Dropdown } from '@circos/ui'
import { useBuilderStore } from '@/features/office/builder/stores/builder-store'
import { useZoneBindingsWrite } from '../hooks/use-zone-bindings-write'
import { DeleteZoneModal } from './delete-zone-modal'

interface ZonePropertiesProps {
  zoneId: string
  onClose: () => void
}

export function ZoneProperties({ zoneId, onClose }: ZonePropertiesProps) {
  const zone = useBuilderStore((s) => s.zones.find((z) => z.id === zoneId))
  const updateZone = useBuilderStore((s) => s.updateZone)
  const deleteZone = useBuilderStore((s) => s.deleteZone)

  const { binding, agents, projects, updateBinding } = useZoneBindingsWrite(zoneId)

  const [showDelete, setShowDelete] = useState(false)

  if (!zone) return null

  const handleDelete = () => {
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
      {/* Section header */}
      <div className="px-4 pt-2 pb-2 shrink-0">
        <div className="flex flex-row items-center">
          <h3 className="text-lg font-semibold text-primary flex-1">Zone Properties</h3>
          {/* DotsVertical overflow menu — NOT a direct back button per CONTEXT.md */}
          <Dropdown.Root>
            <Dropdown.DotsButton />
            <Dropdown.Popover>
              <Dropdown.Menu aria-label="Zone properties menu">
                <Dropdown.Item
                  label="Close"
                  onAction={onClose}
                />
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        </div>
        <p className="text-sm text-tertiary truncate">{zone.label}</p>
      </div>

      {/* Form fields */}
      <div className="flex flex-col gap-4 px-4 py-4 flex-1 overflow-y-auto">
        {/* Zone Label — isRequired renders * in text-brand-tertiary via UUI Label component */}
        <Input
          label="Zone Label"
          value={zone.label}
          onChange={(val) => updateZone(zoneId, { label: val })}
          placeholder="Enter zone name"
          isRequired
        />

        {/* Assigned Agent — reads from office_zone_bindings, writes via API */}
        <Select
          label="Assigned Agent"
          placeholder="Anyone"
          isRequired
          selectedKey={binding?.agent_id ?? ''}
          onSelectionChange={(key) => updateBinding('agent_id', key === '' ? null : String(key))}
          items={agentItems}
        >
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>

        {/* Assigned Project — reads from office_zone_bindings, writes via API */}
        <Select
          label="Assigned Project"
          placeholder="None"
          isRequired
          selectedKey={binding?.project_id ?? ''}
          onSelectionChange={(key) => updateBinding('project_id', key === '' ? null : String(key))}
          items={projectItems}
        >
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>

        {/* Agent Restricted Area */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-secondary">Agent Restricted Area</span>
          <Toggle
            size="sm"
            isSelected={zone.agentRestricted ?? false}
            onChange={(val) => updateZone(zoneId, { agentRestricted: val })}
          />
        </div>
      </div>

      {/* Bottom action — sticky at panel bottom */}
      <div className="px-4 py-4 border-t border-primary shrink-0">
        <Button
          color="tertiary-destructive"
          iconLeading={Trash03}
          onClick={() => setShowDelete(true)}
        >
          Delete Zone
        </Button>
      </div>

      {/* Delete confirmation modal */}
      <DeleteZoneModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        zoneName={zone.label}
      />
    </div>
  )
}
