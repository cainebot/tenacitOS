'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  BoardColumnRow,
  ProjectStateRow,
} from '@/types/project'

export type ColumnWithStates = BoardColumnRow & { state_ids: string[] }

export interface UseBoardSettingsResult {
  columns: ColumnWithStates[]
  states: ProjectStateRow[]
  columnStateMap: Record<string, string[]>
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  assignState: (columnId: string, stateId: string) => Promise<boolean>
  unassignState: (columnId: string, stateId: string) => Promise<boolean>
}

export function useBoardSettings(
  boardId: string,
  projectId: string
): UseBoardSettingsResult {
  const [columns, setColumns] = useState<ColumnWithStates[]>([])
  const [states, setStates] = useState<ProjectStateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const columnStateMap = useMemo(() => {
    return columns.reduce<Record<string, string[]>>((acc, col) => {
      acc[col.column_id] = col.state_ids
      return acc
    }, {})
  }, [columns])

  const hasLoadedOnce = useRef(false)

  const fetchData = useCallback(async () => {
    // Only show loading spinner on initial fetch, not on refetch after mutations
    if (!hasLoadedOnce.current) setLoading(true)
    setError(null)
    try {
      const [columnsRes, statesRes] = await Promise.all([
        fetch(`/api/boards/${boardId}/columns`),
        fetch(`/api/projects/${projectId}/states`),
      ])

      if (!columnsRes.ok) {
        const err = await columnsRes.json()
        setError(err.message || 'Failed to fetch columns')
        return
      }
      if (!statesRes.ok) {
        const err = await statesRes.json()
        setError(err.message || 'Failed to fetch states')
        return
      }

      const columnsData: ColumnWithStates[] = await columnsRes.json()
      const statesData: ProjectStateRow[] = await statesRes.json()

      setColumns(columnsData)
      setStates(statesData)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch board settings'
      )
    } finally {
      hasLoadedOnce.current = true
      setLoading(false)
    }
  }, [boardId, projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const assignState = useCallback(
    async (columnId: string, stateId: string) => {
      const snapshot = columns
      setColumns((prev) =>
        prev.map((col) => {
          if (col.column_id === columnId) {
            const newIds = col.state_ids.includes(stateId)
              ? col.state_ids
              : [...col.state_ids, stateId]
            return { ...col, state_ids: newIds }
          }
          if (col.state_ids.includes(stateId)) {
            return {
              ...col,
              state_ids: col.state_ids.filter((id) => id !== stateId),
            }
          }
          return col
        })
      )
      setError(null)

      try {
        const targetCol = columns.find((c) => c.column_id === columnId)
        const newStateIds = targetCol
          ? targetCol.state_ids.includes(stateId)
            ? targetCol.state_ids
            : [...targetCol.state_ids, stateId]
          : [stateId]

        const sourceCol = columns.find(
          (c) => c.column_id !== columnId && c.state_ids.includes(stateId)
        )

        const targetRes = await fetch(
          `/api/boards/${boardId}/columns/${columnId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state_ids: newStateIds }),
          }
        )
        if (!targetRes.ok) {
          const err = await targetRes.json()
          throw new Error(err.message || 'Failed to assign state')
        }

        if (sourceCol) {
          const sourceStateIds = sourceCol.state_ids.filter(
            (id) => id !== stateId
          )
          const sourceRes = await fetch(
            `/api/boards/${boardId}/columns/${sourceCol.column_id}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state_ids: sourceStateIds }),
            }
          )
          if (!sourceRes.ok) {
            const err = await sourceRes.json()
            throw new Error(
              err.message || 'Failed to remove state from source column'
            )
          }
        }

        await fetchData()
        return true
      } catch (err) {
        setColumns(snapshot)
        setError(err instanceof Error ? err.message : 'Failed to assign state')
        return false
      }
    },
    [columns, boardId, fetchData]
  )

  const unassignState = useCallback(
    async (columnId: string, stateId: string) => {
      const snapshot = columns
      setColumns((prev) =>
        prev.map((col) => {
          if (col.column_id === columnId) {
            return {
              ...col,
              state_ids: col.state_ids.filter((id) => id !== stateId),
            }
          }
          return col
        })
      )
      setError(null)

      try {
        const targetCol = columns.find((c) => c.column_id === columnId)
        const newStateIds = targetCol
          ? targetCol.state_ids.filter((id) => id !== stateId)
          : []

        const res = await fetch(
          `/api/boards/${boardId}/columns/${columnId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state_ids: newStateIds }),
          }
        )
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || 'Failed to unassign state')
        }

        await fetchData()
        return true
      } catch (err) {
        setColumns(snapshot)
        setError(
          err instanceof Error ? err.message : 'Failed to unassign state'
        )
        return false
      }
    },
    [columns, boardId, fetchData]
  )

  return {
    columns,
    states,
    columnStateMap,
    loading,
    error,
    refetch: fetchData,
    assignState,
    unassignState,
  }
}
