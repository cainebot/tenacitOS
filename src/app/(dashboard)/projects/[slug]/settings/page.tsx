'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BoardSetting, type StateCardItem } from '@/components/application/board-setting'
import { useBoardSettings } from '@/hooks/use-board-settings'
import { createBrowserClient } from '@/lib/supabase'
import type { BoardRow, ProjectRow, StateCategory } from '@/types/project'
import type { KanbanBoardColumn } from '@/components/application/kanban-board'

export default function BoardSettingPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const slug = params.slug

  // ---- Discovery: slug → project → board ----
  const [projectId, setProjectId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [boardId, setBoardId] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    async function discover() {
      try {
        const projectRes = await fetch(`/api/projects?slug=${encodeURIComponent(slug)}`)
        if (!projectRes.ok) throw new Error('Project not found')
        const project: ProjectRow = await projectRes.json()
        if (cancelled) return

        setProjectId(project.project_id)
        setProjectName(project.name)

        const boardsRes = await fetch(`/api/boards?project_id=${project.project_id}`)
        const boards: BoardRow[] = await boardsRes.json()
        if (cancelled) return

        if (boards[0]) setBoardId(boards[0].board_id)
      } catch (err) {
        console.error('[board-setting-discovery]', err)
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    discover()
    return () => { cancelled = true }
  }, [slug])

  // ---- Board settings data ----
  const { columns, states, loading, refetch, assignState } = useBoardSettings(boardId, projectId)

  // ---- Card counts per state ----
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!states.length) return
    let cancelled = false

    async function fetchCounts() {
      const supabase = createBrowserClient()

      // Single query: group by state_id
      const { data, error } = await supabase
        .from('cards')
        .select('state_id')
        .in('state_id', states.map((s) => s.state_id))

      if (cancelled) return
      if (error) {
        console.error('[card-counts]', error)
        return
      }

      const counts: Record<string, number> = {}
      // Count occurrences
      for (const row of data ?? []) {
        counts[row.state_id] = (counts[row.state_id] ?? 0) + 1
      }
      // Ensure all states have an entry
      for (const s of states) {
        if (!(s.state_id in counts)) counts[s.state_id] = 0
      }

      setCardCounts(counts)
    }

    fetchCounts()
    return () => { cancelled = true }
  }, [states])

  // ---- Callbacks ----
  const handleBack = useCallback(() => {
    router.push(`/projects/${slug}`)
  }, [router, slug])

  const handleCreateState = useCallback(
    async (data: { name: string; category: StateCategory; color?: string }) => {
      const res = await fetch(`/api/projects/${projectId}/states`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create state')
      await refetch()
    },
    [projectId, refetch],
  )

  const handleDeleteState = useCallback(
    async (stateId: string, targetStateId?: string) => {
      try {
        if (targetStateId) {
          await fetch(`/api/projects/${projectId}/states/${stateId}/reassign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_state_id: targetStateId }),
          })
        }
        const res = await fetch(`/api/projects/${projectId}/states/${stateId}`, {
          method: 'DELETE',
        })
        if (!res.ok) return false
        await refetch()
        return true
      } catch {
        return false
      }
    },
    [projectId, refetch],
  )

  const handleColumnsChange = useCallback(
    async (newBoardColumns: KanbanBoardColumn<StateCardItem>[]) => {
      // Build a map of stateId -> columnId for the new state
      const newStateToCol = new Map<string, string>()
      for (const col of newBoardColumns) {
        for (const item of col.items) {
          newStateToCol.set(item.id, col.id)
        }
      }

      // Build a map of stateId -> columnId for the old state
      const oldStateToCol = new Map<string, string>()
      for (const col of columns) {
        for (const stateId of col.state_ids) {
          oldStateToCol.set(stateId, col.column_id)
        }
      }

      // Find states that changed columns — call assignState for each
      for (const [stateId, newColId] of newStateToCol) {
        const oldColId = oldStateToCol.get(stateId)
        if (oldColId !== newColId) {
          await assignState(newColId, stateId)
        }
      }

      // Handle column reorder: check if column order changed
      const oldOrder = columns.map((c) => c.column_id)
      const newOrder = newBoardColumns.map((c) => c.id)
      const orderChanged =
        oldOrder.length !== newOrder.length ||
        oldOrder.some((id, i) => id !== newOrder[i])

      if (orderChanged) {
        for (let i = 0; i < newOrder.length; i++) {
          const colId = newOrder[i]
          const oldCol = columns.find((c) => c.column_id === colId)
          if (oldCol && oldCol.position !== i) {
            await fetch(`/api/boards/${boardId}/columns/${colId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ position: i }),
            })
          }
        }
      }

      // Handle new columns (from "Add section")
      for (const col of newBoardColumns) {
        if (!columns.find((c) => c.column_id === col.id) && col.id.startsWith('col-')) {
          await fetch(`/api/boards/${boardId}/columns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: col.title,
              position: newBoardColumns.indexOf(col),
            }),
          })
        }
      }

      // Handle deleted columns
      for (const oldCol of columns) {
        if (!newBoardColumns.find((c) => c.id === oldCol.column_id)) {
          await fetch(`/api/boards/${boardId}/columns/${oldCol.column_id}`, {
            method: 'DELETE',
          })
        }
      }

      await refetch()
    },
    [columns, boardId, assignState, refetch],
  )

  // ---- Loading ----
  if (!ready || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-secondary border-t-brand-solid" />
      </div>
    )
  }

  return (
    <BoardSetting
      columns={columns}
      states={states}
      cardCounts={cardCounts}
      projectName={projectName}
      projectSlug={slug}
      onBack={handleBack}
      onCreateState={handleCreateState}
      onDeleteState={handleDeleteState}
      onColumnsChange={handleColumnsChange}
    />
  )
}
