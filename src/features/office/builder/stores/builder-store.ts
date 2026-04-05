'use client'

import { create } from 'zustand'
import type { Zone } from '@/features/office/types'

export type ActiveTool = 'hand' | 'add-zones' | 'blocked' | 'eraser' | 'seat'

interface BuilderState {
  activeTool: ActiveTool
  selectedZoneId: string | null
  zones: Zone[]         // working copy diverges from DB until saved
  dirty: boolean        // unsaved changes flag
  mapId: string | null  // current map being edited
  currentVersionNum: number

  // Actions
  setActiveTool: (tool: ActiveTool) => void
  setSelectedZoneId: (id: string | null) => void
  setZones: (zones: Zone[]) => void
  addZone: (zone: Zone) => void
  updateZone: (id: string, updates: Partial<Zone>) => void
  deleteZone: (id: string) => void
  reorderZones: (zones: Zone[]) => void
  markDirty: () => void
  markClean: () => void
  setMapId: (id: string) => void
  setCurrentVersionNum: (num: number) => void
}

export const useBuilderStore = create<BuilderState>()((set) => ({
  activeTool: 'hand',
  selectedZoneId: null,
  zones: [],
  dirty: false,
  mapId: null,
  currentVersionNum: 0,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedZoneId: (id) => set({ selectedZoneId: id }),
  setZones: (zones) => set({ zones }),
  addZone: (zone) => set((s) => ({ zones: [...s.zones, zone], dirty: true })),
  updateZone: (id, updates) =>
    set((s) => ({
      zones: s.zones.map((z) => (z.id === id ? { ...z, ...updates } : z)),
      dirty: true,
    })),
  deleteZone: (id) =>
    set((s) => ({
      zones: s.zones.filter((z) => z.id !== id),
      dirty: true,
    })),
  reorderZones: (zones) => set({ zones, dirty: true }),
  markDirty: () => set({ dirty: true }),
  markClean: () => set({ dirty: false }),
  setMapId: (id) => set({ mapId: id }),
  setCurrentVersionNum: (num) => set({ currentVersionNum: num }),
}))
