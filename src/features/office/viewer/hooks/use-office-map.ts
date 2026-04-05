'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { PUBLISHED_MAP_ID } from '../../constants'
import type { OfficeMapDocument } from '../../types'
import { HARDCODED_POIS } from '../../projection/zone-seed'

/**
 * Hardcoded fallback — same OfficeMapDocument the hook returned in MVP.
 * Used when Supabase query fails or returns no published version.
 */
const FALLBACK_MAP_DOC: OfficeMapDocument = {
  version: '1.0',
  canvas: {
    gridWidth: 136,
    gridHeight: 97,
    tileSize: 64,
  },
  tiledMapUrl: '/assets/maps/office-v3.json',
  zones: [],
  objects: [],
  spawnPoints: [
    { id: 'player-spawn', gridX: 64, gridY: 48, facing: 'down' as const, forType: 'player' as const },
  ],
  pois: HARDCODED_POIS,
  navGrid: {
    cellSize: 64,
    blocked: [],
  },
}

/**
 * Returns the current office map document from Supabase.
 *
 * Queries office_maps for current_version_id, then fetches map_json
 * from office_map_versions. Falls back to FALLBACK_MAP_DOC if the
 * DB is unreachable, migration hasn't been applied, or query errors.
 */
export function useOfficeMap() {
  const [mapDocument, setMapDocument] = useState<OfficeMapDocument>(FALLBACK_MAP_DOC)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    async function fetchMap() {
      try {
        // 1. Get current_version_id from office_maps
        const { data: mapRow, error: mapErr } = await supabase
          .from('office_maps')
          .select('current_version_id')
          .eq('map_id', PUBLISHED_MAP_ID)
          .single()

        if (mapErr || !mapRow?.current_version_id) {
          console.warn('[useOfficeMap] No published map version, using fallback')
          setLoading(false)
          return
        }

        // 2. Fetch map_json from the version row
        const { data: versionRow, error: vErr } = await supabase
          .from('office_map_versions')
          .select('map_json, schema_version')
          .eq('version_id', mapRow.current_version_id)
          .single()

        if (vErr || !versionRow?.map_json) {
          console.warn('[useOfficeMap] Version fetch failed, using fallback')
          setLoading(false)
          return
        }

        setMapDocument(versionRow.map_json as OfficeMapDocument)
      } catch (err) {
        console.warn('[useOfficeMap] DB query failed, using hardcoded fallback', err)
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    fetchMap()
  }, [supabase])

  return { mapDocument, loading, error }
}
