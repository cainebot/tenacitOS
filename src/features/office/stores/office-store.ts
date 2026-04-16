'use client'

import { create } from 'zustand'
import type { ZoneBinding, POI, OfficeMapDocument } from '../types'

interface OfficeState {
  // State
  mapDocument: OfficeMapDocument | null
  zoneBindings: ZoneBinding[]
  pois: POI[]
  viewMode: 'viewer' | 'builder'

  // Actions
  setMapDocument: (doc: OfficeMapDocument) => void
  setZoneBindings: (bindings: ZoneBinding[]) => void
  setPois: (pois: POI[]) => void
  setViewMode: (mode: 'viewer' | 'builder') => void
}

export const useOfficeStore = create<OfficeState>()((set) => ({
  mapDocument: null,
  zoneBindings: [],      // Empty on init — populated by useZoneBindings() from Supabase
  pois: [],              // Populated from mapDocument.pois by page.tsx via useOfficeMap
  viewMode: 'viewer',

  setMapDocument: (doc) => set({ mapDocument: doc }),
  setZoneBindings: (bindings) => set({ zoneBindings: bindings }),
  setPois: (pois) => set({ pois }),
  setViewMode: (mode) => set({ viewMode: mode }),
}))
