'use client'

import { useCallback, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { DepartmentRow } from '@/types/supabase'

export interface UseRealtimeDepartmentsResult {
  departments: DepartmentRow[]
  loading: boolean
  error: string | null
  resync: () => Promise<void>
}

export function useRealtimeDepartments(): UseRealtimeDepartmentsResult {
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  const fetchAllDepartments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('departments')
        .select('*')
        .order('sort_order')
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setDepartments((data as DepartmentRow[]) ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch departments')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const resync = useCallback(async () => {
    await fetchAllDepartments()
  }, [fetchAllDepartments])

  useEffect(() => {
    // Full resync on mount before subscribing
    fetchAllDepartments()

    const channel = supabase
      .channel('departments-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'departments' },
        (payload) => {
          const eventType = payload.eventType

          if (eventType === 'INSERT') {
            const newDept = payload.new as DepartmentRow
            setDepartments((prev) => [...prev, newDept])
          } else if (eventType === 'UPDATE') {
            const updatedDept = payload.new as DepartmentRow
            setDepartments((prev) =>
              prev.map((d) => (d.id === updatedDept.id ? updatedDept : d))
            )
          } else if (eventType === 'DELETE') {
            const deletedDept = payload.old as Pick<DepartmentRow, 'id'>
            setDepartments((prev) => prev.filter((d) => d.id !== deletedDept.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAllDepartments, supabase])

  return { departments, loading, error, resync }
}
