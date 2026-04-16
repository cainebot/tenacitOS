'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { PUBLISHED_MAP_ID } from '../../constants'
import type { ZoneBinding } from '../../types'

// Fallback bindings used when office_zone_bindings table is unreachable or empty.
// Coordinates match SPAWN_POSITIONS in game/constants.ts.
// Extracted from zone-seed.ts in Phase 84 cleanup (HARDCODED_ZONE_BINDINGS removed).
const FALLBACK_ZONE_BINDINGS: ZoneBinding[] = [
  { binding_id: 'desk-pomni',   zone_id: 'zone-pomni-desk',   binding_type: 'agent_desk', agent_id: 'pomni',   project_id: null, board_id: null, grid_x: 48, grid_y: 42, label: 'Pomni Desk',   color: null, zone_type: 'desk', room_capability: null },
  { binding_id: 'desk-kinger',  zone_id: 'zone-kinger-desk',  binding_type: 'agent_desk', agent_id: 'kinger',  project_id: null, board_id: null, grid_x: 58, grid_y: 38, label: 'Kinger Desk',  color: null, zone_type: 'desk', room_capability: null },
  { binding_id: 'desk-ragatha', zone_id: 'zone-ragatha-desk', binding_type: 'agent_desk', agent_id: 'ragatha', project_id: null, board_id: null, grid_x: 68, grid_y: 42, label: 'Ragatha Desk', color: null, zone_type: 'desk', room_capability: null },
  { binding_id: 'desk-jax',     zone_id: 'zone-jax-desk',     binding_type: 'agent_desk', agent_id: 'jax',     project_id: null, board_id: null, grid_x: 42, grid_y: 55, label: 'Jax Desk',     color: null, zone_type: 'desk', room_capability: null },
  { binding_id: 'desk-gangle',  zone_id: 'zone-gangle-desk',  binding_type: 'agent_desk', agent_id: 'gangle',  project_id: null, board_id: null, grid_x: 90, grid_y: 38, label: 'Gangle Desk',  color: null, zone_type: 'desk', room_capability: null },
  { binding_id: 'desk-kaufmo',  zone_id: 'zone-kaufmo-desk',  binding_type: 'agent_desk', agent_id: 'kaufmo',  project_id: null, board_id: null, grid_x: 55, grid_y: 60, label: 'Kaufmo Desk',  color: null, zone_type: 'desk', room_capability: null },
  { binding_id: 'desk-zooble',  zone_id: 'zone-zooble-desk',  binding_type: 'agent_desk', agent_id: 'zooble',  project_id: null, board_id: null, grid_x: 82, grid_y: 55, label: 'Zooble Desk',  color: null, zone_type: 'desk', room_capability: null },
]

export interface UseZoneBindingsResult {
  zoneBindings: ZoneBinding[]
  isLoading: boolean
  error: string | null
}

/**
 * Fetches zone bindings from Supabase office_zone_bindings for the published map.
 * Subscribes to Realtime for INSERT/UPDATE/DELETE.
 * Falls back to FALLBACK_ZONE_BINDINGS if the query fails or returns no rows.
 *
 * Pattern: matches useRealtimeAgents (createBrowserClient, full resync on mount,
 * incremental updates via postgres_changes).
 */
export function useZoneBindings(): UseZoneBindingsResult {
  const [zoneBindings, setZoneBindings] = useState<ZoneBinding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()
  const usedFallbackRef = useRef(false)

  const fetchBindings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    usedFallbackRef.current = false
    try {
      const { data, error: fetchError } = await supabase
        .from('office_zone_bindings')
        .select('*')
        .eq('map_id', PUBLISHED_MAP_ID)

      if (fetchError) {
        console.warn('[useZoneBindings] Supabase error, falling back to hardcoded:', fetchError.message)
        setError(fetchError.message)
        setZoneBindings(FALLBACK_ZONE_BINDINGS)
        usedFallbackRef.current = true
      } else {
        const rows = (data ?? []) as ZoneBinding[]
        if (rows.length === 0) {
          // No rows in DB yet — fall back to hardcoded until migration is applied
          console.warn('[useZoneBindings] No rows found in office_zone_bindings, using hardcoded fallback')
          setZoneBindings(FALLBACK_ZONE_BINDINGS)
          usedFallbackRef.current = true
        } else {
          setZoneBindings(rows)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch zone bindings'
      console.warn('[useZoneBindings] Unexpected error, falling back to hardcoded:', msg)
      setError(msg)
      setZoneBindings(FALLBACK_ZONE_BINDINGS)
      usedFallbackRef.current = true
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    // Full resync on mount before subscribing
    fetchBindings()

    const channel = supabase
      .channel('office-zone-bindings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'office_zone_bindings',
          filter: `map_id=eq.${PUBLISHED_MAP_ID}`,
        },
        (payload) => {
          // If we are on fallback data, skip incremental updates — they reference DB rows
          if (usedFallbackRef.current) return

          const eventType = payload.eventType

          if (eventType === 'INSERT') {
            const newBinding = payload.new as ZoneBinding
            setZoneBindings((prev) => [...prev, newBinding])
          } else if (eventType === 'UPDATE') {
            const updated = payload.new as ZoneBinding
            setZoneBindings((prev) =>
              prev.map((b) => (b.binding_id === updated.binding_id ? updated : b))
            )
          } else if (eventType === 'DELETE') {
            const deleted = payload.old as Pick<ZoneBinding, 'binding_id'>
            setZoneBindings((prev) =>
              prev.filter((b) => b.binding_id !== deleted.binding_id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchBindings, supabase])

  return { zoneBindings, isLoading, error }
}
