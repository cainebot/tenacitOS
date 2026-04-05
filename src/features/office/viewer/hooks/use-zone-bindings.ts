'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { ZoneBinding } from '../../types'
import { HARDCODED_ZONE_BINDINGS } from '../../projection/zone-seed'

const PUBLISHED_MAP_ID = '11111111-1111-1111-1111-111111111111'

export interface UseZoneBindingsResult {
  zoneBindings: ZoneBinding[]
  isLoading: boolean
  error: string | null
}

/**
 * Fetches zone bindings from Supabase office_zone_bindings for the published map.
 * Subscribes to Realtime for INSERT/UPDATE/DELETE.
 * Falls back to HARDCODED_ZONE_BINDINGS if the query fails.
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
        setZoneBindings(HARDCODED_ZONE_BINDINGS)
        usedFallbackRef.current = true
      } else {
        const rows = (data ?? []) as ZoneBinding[]
        if (rows.length === 0) {
          // No rows in DB yet — fall back to hardcoded until migration is applied
          console.warn('[useZoneBindings] No rows found in office_zone_bindings, using hardcoded fallback')
          setZoneBindings(HARDCODED_ZONE_BINDINGS)
          usedFallbackRef.current = true
        } else {
          setZoneBindings(rows)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch zone bindings'
      console.warn('[useZoneBindings] Unexpected error, falling back to hardcoded:', msg)
      setError(msg)
      setZoneBindings(HARDCODED_ZONE_BINDINGS)
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
