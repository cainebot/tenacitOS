'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Activity } from '@/lib/activities-db'

export interface UseAgentActivityResult {
  activities: Activity[]
  total: number
  loading: boolean
  error: string | null
  hasMore: boolean
  refetch: () => Promise<void>
  fetchMore: () => Promise<void>
}

/**
 * Fetches activity records for a specific agent from the SQLite activities database.
 *
 * @param agentName - The agent's display name (e.g. "ragatha"), NOT the agent_id UUID.
 *   The activities.db `agent` column stores name strings, so this must match
 *   the value from `useAgent().agent?.name`. Passing an agent_id UUID will
 *   return zero results.
 * @param options - Optional configuration (limit defaults to 20)
 */
export function useAgentActivity(
  agentName: string,
  options?: { limit?: number }
): UseAgentActivityResult {
  const [activities, setActivities] = useState<Activity[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/activities?agent=${encodeURIComponent(agentName)}&sort=newest&limit=${options?.limit ?? 20}`
      const response = await fetch(url)
      if (!response.ok) {
        setError(`Failed to fetch activities: ${response.statusText}`)
        return
      }
      const data: { activities: Activity[]; total: number; hasMore: boolean } = await response.json()
      setActivities(data.activities)
      setTotal(data.total)
      setHasMore(data.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities')
    } finally {
      setLoading(false)
    }
  }, [agentName, options?.limit])

  const fetchMore = useCallback(async () => {
    if (!hasMore) return
    try {
      const url = `/api/activities?agent=${encodeURIComponent(agentName)}&sort=newest&limit=${options?.limit ?? 20}&offset=${activities.length}`
      const response = await fetch(url)
      if (!response.ok) {
        setError(`Failed to fetch more activities: ${response.statusText}`)
        return
      }
      const data: { activities: Activity[]; total: number; hasMore: boolean } = await response.json()
      setActivities((prev) => [...prev, ...data.activities])
      setTotal(data.total)
      setHasMore(data.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch more activities')
    }
  }, [agentName, options?.limit, activities.length, hasMore])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  return { activities, total, loading, error, hasMore, refetch: fetchActivities, fetchMore }
}
