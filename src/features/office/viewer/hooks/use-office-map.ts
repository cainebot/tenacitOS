'use client'

import { useMemo } from 'react'
import type { OfficeMapDocument } from '../../types'
import { HARDCODED_POIS } from '../../projection/zone-seed'

/**
 * Returns the current office map document.
 *
 * MVP: Returns a hardcoded OfficeMapDocument built from zone-seed.ts data
 * and known map constants (136x97 tiles, 64px, office-v3.json).
 *
 * Future: Will fetch published map from office_maps Supabase table.
 */
export function useOfficeMap(_mapId?: string): {
  mapDocument: OfficeMapDocument
  loading: boolean
  error: string | null
} {
  const mapDocument = useMemo<OfficeMapDocument>(() => ({
    version: '1.0',
    canvas: {
      gridWidth: 136,
      gridHeight: 97,
      tileSize: 64,
    },
    tiledMapUrl: '/assets/maps/office-v3.json',
    zones: [],  // MVP: no zone polygons parsed from Tiled
    objects: [], // MVP: no placed objects
    spawnPoints: [
      { id: 'player-spawn', gridX: 64, gridY: 48, facing: 'down' as const, forType: 'player' as const },
    ],
    pois: HARDCODED_POIS,
    navGrid: {
      cellSize: 64,
      blocked: [],  // MVP: no collision layer parsed
    },
  }), [])

  return {
    mapDocument,
    loading: false,
    error: null,
  }
}
