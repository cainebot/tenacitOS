'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { Button } from '@circos/ui'
import { Plus } from '@untitledui/icons'
import { useBuilderStore } from '@/features/office/builder/stores/builder-store'
import { ZoneCard } from './zone-card'

const COLOR_PALETTE = [
  '#6172f3',
  '#15b79e',
  '#f79009',
  '#f04438',
  '#7a5af8',
  '#ee46bc',
  '#2e90fa',
  '#66c61c',
]

interface ZoneListProps {
  onEdit: (id: string) => void
}

export function ZoneList({ onEdit }: ZoneListProps) {
  const zones = useBuilderStore((s) => s.zones)
  const selectedZoneId = useBuilderStore((s) => s.selectedZoneId)
  const setSelectedZoneId = useBuilderStore((s) => s.setSelectedZoneId)
  const addZone = useBuilderStore((s) => s.addZone)
  const reorderZones = useBuilderStore((s) => s.reorderZones)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Toggle-select: clicking an active zone deselects it
  const handleSelect = (id: string) => {
    const current = useBuilderStore.getState().selectedZoneId
    setSelectedZoneId(current === id ? null : id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = zones.findIndex((z) => z.id === active.id)
    const newIndex = zones.findIndex((z) => z.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(zones, oldIndex, newIndex)
    const updatedZones = reordered.map((z, i) => ({ ...z, displayOrder: i + 1 }))
    reorderZones(updatedZones)
  }

  const handleAddZone = () => {
    const newZone = {
      id: crypto.randomUUID(),
      displayOrder: zones.length + 1,
      label: `Zone ${zones.length + 1}`,
      type: 'room',
      color: COLOR_PALETTE[zones.length % COLOR_PALETTE.length],
      gridCells: [],
      agentRestricted: false,
      seats: [],
    }
    addZone(newZone)
    setSelectedZoneId(newZone.id)
  }

  return (
    <div className="flex flex-col gap-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={zones.map((z) => z.id)}
          strategy={verticalListSortingStrategy}
        >
          {zones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              isActive={selectedZoneId === zone.id}
              onSelect={handleSelect}
              onEdit={onEdit}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div className="pt-2">
        <Button color="secondary" size="md" iconLeading={Plus} className="w-full" onClick={handleAddZone}>
          New Zone
        </Button>
      </div>
    </div>
  )
}
