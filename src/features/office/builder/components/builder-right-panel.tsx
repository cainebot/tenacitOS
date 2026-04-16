'use client'

import { useState } from 'react'
import { Dropdown, Tabs, TabList, Tab, Hammer, Armchair } from '@circos/ui'
import { ZoneList } from './zone-list'
import { ZoneProperties } from './zone-properties'

function PanelHeader() {
  return (
    <div className="flex gap-4 items-start w-full">
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-primary">Zones</h3>
        <p className="text-sm text-tertiary truncate">
          Administra las zonas de tu oficina creando u editando zonas.
        </p>
      </div>
      <Dropdown.Root>
        <Dropdown.DotsButton />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="Panel menu">
            <Dropdown.Item label="Close panel" isDisabled />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>
    </div>
  )
}

export function BuilderRightPanel() {
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('build')

  return (
    <div className="w-[373px] shrink-0 bg-secondary border-l border-primary flex flex-col h-full overflow-hidden">
      {editingZoneId ? (
        <ZoneProperties
          zoneId={editingZoneId}
          onClose={() => setEditingZoneId(null)}
        />
      ) : (
        <>
          {/* Section header — bg-primary, border-b, title + tabs */}
          <div className="bg-primary border-b border-primary shrink-0 flex flex-col gap-5 px-4 pt-4 pb-4">
            <PanelHeader />
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as string)}
            >
              <TabList type="button-minimal" fullWidth>
                <Tab id="build" className="flex">
                  <Hammer className="size-4" />
                  Build
                </Tab>
                <Tab id="objetcs" className="flex">
                  <Armchair className="size-4" />
                  Objetcs
                </Tab>
              </TabList>
            </Tabs>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'build' ? (
              <ZoneList onEdit={(id) => setEditingZoneId(id)} />
            ) : (
              <p className="text-sm text-tertiary">Coming soon</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
