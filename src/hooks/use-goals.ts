'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { GoalRow, GoalLevel } from '@/types/project'

export interface UseGoalsResult {
  goals: GoalRow[]
  loading: boolean
  error: string | null
  createGoal: (data: {
    title: string
    description?: string
    level: GoalLevel
    parent_id?: string
    project_id?: string
  }) => Promise<GoalRow | null>
  updateGoal: (
    id: string,
    data: Partial<Pick<GoalRow, 'title' | 'description' | 'status' | 'parent_id'>>
  ) => Promise<GoalRow | null>
  deleteGoal: (id: string) => Promise<boolean>
  companyGoals: GoalRow[]
  departmentGoals: GoalRow[]
}

export function useGoals(projectId?: string): UseGoalsResult {
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ----- Initial data fetch -----
  const fetchGoals = useCallback(async () => {
    try {
      const url = projectId ? `/api/goals?project_id=${projectId}` : '/api/goals'
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Failed to fetch goals')
        return
      }
      const data: GoalRow[] = await res.json()
      setGoals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  // ----- Supabase Realtime subscription -----
  useEffect(() => {
    const supabase = createBrowserClient()
    // Unique channel per scope prevents sharing/cleanup collision when hook is
    // mounted in multiple places simultaneously (ProjectOverviewTab + TaskDetailPanel)
    const channelName = projectId
      ? `goals-realtime:${projectId}`
      : 'goals-realtime:global'

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'goals' },
        (payload) => {
          const newGoal = payload.new as GoalRow
          if (projectId && newGoal.project_id !== projectId) return  // cross-project guard
          setGoals((prev) => [...prev, newGoal])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'goals' },
        (payload) => {
          const updated = payload.new as GoalRow
          if (projectId && updated.project_id !== projectId) return  // cross-project guard
          setGoals((prev) =>
            prev.map((g) => (g.goal_id === updated.goal_id ? updated : g))
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'goals' },
        (payload) => {
          const deleted = payload.old as Partial<GoalRow>
          if (deleted.goal_id) {
            setGoals((prev) => prev.filter((g) => g.goal_id !== deleted.goal_id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  // ----- Mutations -----

  const createGoal = useCallback(
    async (data: {
      title: string
      description?: string
      level: GoalLevel
      parent_id?: string
      project_id?: string
    }): Promise<GoalRow | null> => {
      try {
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const err = await res.json()
          setError(err.error ?? 'Failed to create goal')
          return null
        }
        // Realtime subscription will add the goal to state
        return (await res.json()) as GoalRow
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create goal')
        return null
      }
    },
    []
  )

  const updateGoal = useCallback(
    async (
      id: string,
      data: Partial<Pick<GoalRow, 'title' | 'description' | 'status' | 'parent_id'>>
    ): Promise<GoalRow | null> => {
      try {
        const res = await fetch(`/api/goals/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const err = await res.json()
          setError(err.error ?? 'Failed to update goal')
          return null
        }
        // Realtime subscription will update state
        return (await res.json()) as GoalRow
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update goal')
        return null
      }
    },
    []
  )

  const deleteGoal = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.status === 204 || res.ok) {
        // Realtime subscription will remove from state
        return true
      }
      const err = await res.json()
      setError(err.error ?? 'Failed to delete goal')
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal')
      return false
    }
  }, [])

  // ----- Computed values -----

  const companyGoals = useMemo(
    () => goals.filter((g) => g.level === 'company'),
    [goals]
  )

  const departmentGoals = useMemo(
    () => goals.filter((g) => g.level === 'department'),
    [goals]
  )

  return {
    goals,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    companyGoals,
    departmentGoals,
  }
}
