'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { ActivityLogRow } from '@/types/project'

export interface UseRealtimeActivityLogResult {
  activities: ActivityLogRow[]
  loading: boolean
}

/**
 * Type guard to validate that a Realtime payload matches ActivityLogRow shape.
 */
function isActivityLogRow(val: unknown): val is ActivityLogRow {
  const r = val as Record<string, unknown>
  return (
    typeof r?.id === 'string' &&
    typeof r?.action === 'string'
  )
}

/**
 * useRealtimeActivityLog
 * Subscribes to INSERT events on activity_log filtered by card_id.
 * Pattern mirrors use-realtime-task-messages.ts — single channel, dedup by id.
 */
export function useRealtimeActivityLog(cardId: string | null): UseRealtimeActivityLogResult {
  const [activities, setActivities] = useState<ActivityLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createBrowserClient(), [])

  const fetchActivities = useCallback(async () => {
    if (!cardId) {
      setActivities([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data } = await supabase
        .from('activity_log')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: true })

      setActivities((data as ActivityLogRow[]) ?? [])
    } catch (err) {
      console.error('[use-realtime-activity-log] fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, cardId])

  useEffect(() => {
    if (!cardId) {
      setActivities([])
      setLoading(false)
      return
    }

    fetchActivities()

    let alive = true

    const channel = supabase
      .channel(`activity-log-${cardId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `card_id=eq.${cardId}`,
        },
        (payload) => {
          if (alive && isActivityLogRow(payload.new)) {
            setActivities((prev) => {
              // Deduplicate by id
              if (prev.some((a) => a.id === (payload.new as ActivityLogRow).id)) return prev
              return [...prev, payload.new as ActivityLogRow]
            })
          }
        }
      )
      .subscribe()

    return () => {
      alive = false
      supabase.removeChannel(channel)
    }
  }, [fetchActivities, supabase, cardId])

  return { activities, loading }
}
