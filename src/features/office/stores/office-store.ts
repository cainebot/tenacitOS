'use client'

import { create } from 'zustand'
import type { ZoneBinding, POI, OfficeMapDocument } from '../types'
import { HARDCODED_ZONE_BINDINGS, HARDCODED_POIS } from '../projection/zone-seed'

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
  zoneBindings: HARDCODED_ZONE_BINDINGS,  // Seeded with hardcoded data for MVP
  pois: HARDCODED_POIS,                    // Seeded with hardcoded data for MVP
  viewMode: 'viewer',

  setMapDocument: (doc) => set({ mapDocument: doc }),
  setZoneBindings: (bindings) => set({ zoneBindings: bindings }),
  setPois: (pois) => set({ pois }),
  setViewMode: (mode) => set({ viewMode: mode }),
}))
