'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { GoalRow } from '@/types/project'

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface UseGoalDetailResult {
  goal: GoalRow | null
  subGoals: GoalRow[]
  loading: boolean
  error: string | null
  updateGoal: (fields: Partial<GoalRow>) => Promise<GoalRow | null>
  createSubGoal: (title: string) => Promise<GoalRow | null>
  deleteGoal: () => Promise<boolean>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGoalDetail(goalId: string | null): UseGoalDetailResult {
  const [goal, setGoal] = useState<GoalRow | null>(null)
  const [subGoals, setSubGoals] = useState<GoalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce timer ref for text fields (title, description)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ----- Initial data fetch -----
  useEffect(() => {
    if (!goalId) {
      setGoal(null)
      setSubGoals([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const fetchData = async () => {
      try {
        // Fetch goal and sub-goals in parallel
        const [goalRes, subGoalsRes] = await Promise.all([
          fetch(`/api/goals/${goalId}`, {
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`/api/goals?parent_id=${goalId}`, {
            headers: { 'Content-Type': 'application/json' },
          }),
        ])

        if (!goalRes.ok) {
          const err = await goalRes.json()
          setError(err.error ?? 'Failed to fetch goal')
          return
        }

        const goalData: GoalRow = await goalRes.json()
        setGoal(goalData)

        if (subGoalsRes.ok) {
          const subGoalsData: GoalRow[] = await subGoalsRes.json()
          setSubGoals(subGoalsData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch goal')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [goalId])

  // ----- Supabase Realtime subscription -----
  useEffect(() => {
    if (!goalId) return

    const supabase = createBrowserClient()

    const channel = supabase
      .channel(`goal-detail:${goalId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'goals',
          filter: `goal_id=eq.${goalId}`,
        },
        (payload) => setGoal(payload.new as GoalRow)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `parent_id=eq.${goalId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSubGoals((prev) => [...prev, payload.new as GoalRow])
          }
          if (payload.eventType === 'UPDATE') {
            setSubGoals((prev) =>
              prev.map((g) =>
                g.goal_id === (payload.new as GoalRow).goal_id
                  ? (payload.new as GoalRow)
                  : g
              )
            )
          }
          if (payload.eventType === 'DELETE') {
            setSubGoals((prev) =>
              prev.filter(
                (g) => g.goal_id !== (payload.old as Partial<GoalRow>).goal_id
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [goalId])

  // ----- Mutations -----

  const updateGoal = useCallback(
    async (fields: Partial<GoalRow>): Promise<GoalRow | null> => {
      if (!goalId) return null

      const isTextOnlyUpdate =
        Object.keys(fields).every((k) => k === 'title' || k === 'description')

      const doUpdate = async (f: Partial<GoalRow>) => {
        try {
          const res = await fetch(`/api/goals/${goalId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(f),
          })
          if (!res.ok) {
            const err = await res.json()
            setError(err.error ?? 'Failed to update goal')
            return null
          }
          // Realtime subscription will sync state; also apply optimistic update
          const updated = (await res.json()) as GoalRow
          setGoal(updated)
          return updated
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to update goal')
          return null
        }
      }

      if (isTextOnlyUpdate) {
        // Debounce text-only updates by 500ms
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }
        return new Promise((resolve) => {
          debounceTimerRef.current = setTimeout(async () => {
            const result = await doUpdate(fields)
            resolve(result)
          }, 500)
        })
      }

      // Immediate update for numeric/boolean/epic changes
      return doUpdate(fields)
    },
    [goalId]
  )

  const createSubGoal = useCallback(
    async (title: string): Promise<GoalRow | null> => {
      if (!goalId || !goal) return null

      try {
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim() || 'Untitled Sub Goal',
            level: 'department',
            parent_id: goalId,
            project_id: goal.project_id,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          setError(err.error ?? 'Failed to create sub-goal')
          return null
        }
        const newSubGoal = (await res.json()) as GoalRow
        // Realtime subscription will add to subGoals; also apply optimistic update
        setSubGoals((prev) => [...prev, newSubGoal])
        return newSubGoal
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to create sub-goal'
        )
        return null
      }
    },
    [goalId, goal]
  )

  const deleteGoal = useCallback(async (): Promise<boolean> => {
    if (!goalId) return false

    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.status === 204 || res.ok) {
        return true
      }
      const err = await res.json()
      setError(err.error ?? 'Failed to delete goal')
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal')
      return false
    }
  }, [goalId])

  return {
    goal,
    subGoals,
    loading,
    error,
    updateGoal,
    createSubGoal,
    deleteGoal,
  }
}
