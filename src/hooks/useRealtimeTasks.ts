'use client'

import { useCallback, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { TaskRow } from '@/types/supabase'

export interface UseRealtimeTasksResult {
  tasks: TaskRow[]
  loading: boolean
  error: string | null
  resync: () => Promise<void>
}

export function useRealtimeTasks(): UseRealtimeTasksResult {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  const fetchAllTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setTasks((data as TaskRow[]) ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const resync = useCallback(async () => {
    await fetchAllTasks()
  }, [fetchAllTasks])

  useEffect(() => {
    // Full resync on mount before subscribing
    fetchAllTasks()

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          const eventType = payload.eventType

          if (eventType === 'INSERT') {
            const newTask = payload.new as TaskRow
            // Prepend so newest tasks appear first (matches DESC order)
            setTasks((prev) => [newTask, ...prev])
          } else if (eventType === 'UPDATE') {
            const updatedTask = payload.new as TaskRow
            const oldTask = payload.old as Partial<TaskRow>
            // FLOW-05: Emit custom DOM event on task completion for Phase 13 Phaser animation hook
            if (updatedTask.status === 'completed' && oldTask?.status !== 'completed') {
              window.dispatchEvent(new CustomEvent('task-completed', {
                detail: { taskId: updatedTask.task_id, agentId: updatedTask.target_agent_id }
              }))
            }
            setTasks((prev) =>
              prev.map((t) => (t.task_id === updatedTask.task_id ? updatedTask : t))
            )
          } else if (eventType === 'DELETE') {
            const deletedTask = payload.old as Pick<TaskRow, 'task_id'>
            setTasks((prev) => prev.filter((t) => t.task_id !== deletedTask.task_id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAllTasks, supabase])

  return { tasks, loading, error, resync }
}
