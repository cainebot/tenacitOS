'use client'

import { useState } from 'react'
import { DotsVertical } from '@untitledui/icons'
import { Button, Dropdown, Tabs, TabList, Tab, TabPanel } from '@circos/ui'
import { ZoneList } from './zone-list'
import { ZoneProperties } from './zone-properties'

export function BuilderRightPanel() {
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)

  return (
    <div className="w-[373px] shrink-0 bg-secondary border-l border-primary flex flex-col h-full overflow-hidden">
      {/* Section header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex flex-row items-center">
          <h3 className="text-lg font-semibold text-primary flex-1">Zones</h3>
          <Dropdown.Root>
            <Dropdown.DotsButton />
            <Dropdown.Popover>
              <Dropdown.Menu aria-label="Panel menu">
                <Dropdown.Item label="Close panel" isDisabled />
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        </div>
        <p className="text-sm text-tertiary truncate">Manage office zones and properties</p>
      </div>

      {/* If editing a zone, show ZoneProperties, else show tabs with zone list */}
      {editingZoneId ? (
        <ZoneProperties
          zoneId={editingZoneId}
          onClose={() => setEditingZoneId(null)}
        />
      ) : (
        <Tabs className="flex flex-col flex-1 min-h-0">
          <TabList className="mx-3 mb-1 shrink-0">
            <Tab id="build">Build</Tab>
            <Tab id="objetcs">Objetcs</Tab>
          </TabList>

          <TabPanel id="build" className="flex-1 overflow-y-auto px-3 py-2 pt-0">
            <ZoneList onEdit={(id) => setEditingZoneId(id)} />
          </TabPanel>

          <TabPanel id="objetcs" className="flex-1 overflow-y-auto px-3 py-2 pt-0">
            <p className="text-sm text-tertiary p-4">Coming soon</p>
          </TabPanel>
        </Tabs>
      )}
    </div>
  )
}
