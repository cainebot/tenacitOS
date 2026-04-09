'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BoardSetting } from '@/components/application/board-setting'
import { useBoardSettings } from '@/hooks/use-board-settings'
import { createBrowserClient } from '@/lib/supabase'
import type { BoardRow, ProjectRow, StateCategory } from '@/types/project'

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
  const { columns, states, loading, refetch, assignState, unassignState } = useBoardSettings(
    boardId,
    projectId,
  )

  // ---- Card counts per state ----
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!states.length) return
    let cancelled = false

    async function fetchCounts() {
      const supabase = createBrowserClient()

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
      for (const row of data ?? []) {
        counts[row.state_id] = (counts[row.state_id] ?? 0) + 1
      }
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

  const handleColumnRename = useCallback(
    (columnId: string, name: string) => {
      fetch(`/api/boards/${boardId}/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).catch(() => refetch())
    },
    [boardId, refetch],
  )

  const handleColumnDelete = useCallback(
    async (columnId: string) => {
      // Find any assigned state and unassign it first (state returns to sidebar per D-02)
      const col = columns.find((c) => c.column_id === columnId)
      if (col) {
        for (const stateId of col.state_ids) {
          await unassignState(columnId, stateId)
        }
      }
      await fetch(`/api/boards/${boardId}/columns/${columnId}`, { method: 'DELETE' })
      await refetch()
    },
    [columns, boardId, unassignState, refetch],
  )

  const handleColumnAdd = useCallback(async () => {
    const position = columns.length
    await fetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New section', position }),
    })
    await refetch()
  }, [boardId, columns.length, refetch])

  const handleColumnsReorder = useCallback(
    async (columnIds: string[]) => {
      // Update position for each column in new order
      await Promise.all(
        columnIds.map((colId, i) =>
          fetch(`/api/boards/${boardId}/columns/${colId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: i }),
          }),
        ),
      )
      await refetch()
    },
    [boardId, refetch],
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
      onColumnRename={handleColumnRename}
      onColumnDelete={handleColumnDelete}
      onColumnAdd={handleColumnAdd}
      onColumnsReorder={handleColumnsReorder}
      assignState={assignState}
      unassignState={unassignState}
    />
  )
}
