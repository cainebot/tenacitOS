'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ProjectStateRow, StateCategory } from '@/types/project'

export interface UseProjectStatesResult {
  states: ProjectStateRow[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createState: (data: {
    name: string
    category: StateCategory
    color?: string
    position?: number
  }) => Promise<ProjectStateRow | null>
  updateState: (
    stateId: string,
    data: {
      name?: string
      category?: StateCategory
      color?: string
      position?: number
    }
  ) => Promise<ProjectStateRow | null>
  deleteState: (stateId: string, targetStateId?: string) => Promise<boolean>
}

export function useProjectStates(projectId: string): UseProjectStatesResult {
  const [states, setStates] = useState<ProjectStateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/states`)
      if (!res.ok) {
        const err = await res.json()
        setError(err.message || 'Failed to fetch states')
        return
      }
      const data: ProjectStateRow[] = await res.json()
      setStates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch states')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchStates()
  }, [fetchStates])

  const createState = useCallback(
    async (data: {
      name: string
      category: StateCategory
      color?: string
      position?: number
    }) => {
      const snapshot = states
      const tempState: ProjectStateRow = {
        state_id: crypto.randomUUID(),
        project_id: projectId,
        name: data.name,
        category: data.category,
        color: data.color ?? '#6B7280',
        position: data.position ?? states.length,
        created_at: new Date().toISOString(),
      }
      setStates((prev) => [...prev, tempState])
      setError(null)

      try {
        const res = await fetch(`/api/projects/${projectId}/states`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || 'Failed to create state')
        }
        const created: ProjectStateRow = await res.json()
        await fetchStates()
        return created
      } catch (err) {
        setStates(snapshot)
        setError(err instanceof Error ? err.message : 'Failed to create state')
        return null
      }
    },
    [states, projectId, fetchStates]
  )

  const updateState = useCallback(
    async (
      stateId: string,
      data: {
        name?: string
        category?: StateCategory
        color?: string
        position?: number
      }
    ) => {
      const snapshot = states
      setStates((prev) =>
        prev.map((s) => (s.state_id === stateId ? { ...s, ...data } : s))
      )
      setError(null)

      try {
        const res = await fetch(
          `/api/projects/${projectId}/states/${stateId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        )
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || 'Failed to update state')
        }
        const updated: ProjectStateRow = await res.json()
        await fetchStates()
        return updated
      } catch (err) {
        setStates(snapshot)
        setError(err instanceof Error ? err.message : 'Failed to update state')
        return null
      }
    },
    [states, projectId, fetchStates]
  )

  const deleteState = useCallback(
    async (stateId: string, targetStateId?: string) => {
      const snapshot = states
      setStates((prev) => prev.filter((s) => s.state_id !== stateId))
      setError(null)

      try {
        if (targetStateId) {
          const res = await fetch(
            `/api/projects/${projectId}/states/${stateId}/reassign`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ target_state_id: targetStateId }),
            }
          )
          if (!res.ok) {
            const err = await res.json()
            throw new Error(
              err.message || 'Failed to reassign and delete state'
            )
          }
        } else {
          const res = await fetch(
            `/api/projects/${projectId}/states/${stateId}`,
            { method: 'DELETE' }
          )
          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.message || 'Failed to delete state')
          }
        }
        await fetchStates()
        return true
      } catch (err) {
        setStates(snapshot)
        setError(err instanceof Error ? err.message : 'Failed to delete state')
        return false
      }
    },
    [states, projectId, fetchStates]
  )

  return {
    states,
    loading,
    error,
    refetch: fetchStates,
    createState,
    updateState,
    deleteState,
  }
}
