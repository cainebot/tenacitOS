'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { AgentProjectRoleRow } from '@/types/project'

export interface UseAgentProjectRolesResult {
  roles: AgentProjectRoleRow[]
  loading: boolean
  error: string | null
  createRole: (data: {
    agent_id: string
    project_id: string
    reports_to?: string
    title?: string
    role?: string
  }) => Promise<AgentProjectRoleRow | null>
  updateRole: (
    id: string,
    data: Partial<Pick<AgentProjectRoleRow, 'reports_to' | 'title' | 'role'>>
  ) => Promise<AgentProjectRoleRow | null>
  deleteRole: (id: string) => Promise<boolean>
}

export function useAgentProjectRoles(projectId: string): UseAgentProjectRolesResult {
  const [roles, setRoles] = useState<AgentProjectRoleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initial fetch
  const fetchRoles = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/agent-project-roles?project_id=${projectId}`)
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Error al cargar los roles del proyecto')
        return
      }
      const data: AgentProjectRoleRow[] = await res.json()
      setRoles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los roles del proyecto')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  // Supabase Realtime subscription
  useEffect(() => {
    if (!projectId) return

    const supabase = createBrowserClient()
    const channel = supabase
      .channel(`agent_project_roles:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_project_roles',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRoles((prev) => [...prev, payload.new as AgentProjectRoleRow])
          } else if (payload.eventType === 'UPDATE') {
            setRoles((prev) =>
              prev.map((r) =>
                r.id === (payload.new as AgentProjectRoleRow).id
                  ? (payload.new as AgentProjectRoleRow)
                  : r
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setRoles((prev) =>
              prev.filter((r) => r.id !== (payload.old as { id: string }).id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  // Create a new role
  const createRole = useCallback(
    async (data: {
      agent_id: string
      project_id: string
      reports_to?: string
      title?: string
      role?: string
    }): Promise<AgentProjectRoleRow | null> => {
      setError(null)
      try {
        const res = await fetch('/api/agent-project-roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const err = await res.json()
          if (res.status === 409) {
            setError('Este agente ya tiene un rol en este proyecto')
          } else if (res.status === 422) {
            setError(err.error ?? 'Esta relacion crearia un ciclo. Elige un agente diferente.')
          } else {
            setError(err.error ?? 'Error al crear el rol')
          }
          return null
        }
        const row: AgentProjectRoleRow = await res.json()
        return row
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al crear el rol')
        return null
      }
    },
    []
  )

  // Update an existing role
  const updateRole = useCallback(
    async (
      id: string,
      data: Partial<Pick<AgentProjectRoleRow, 'reports_to' | 'title' | 'role'>>
    ): Promise<AgentProjectRoleRow | null> => {
      setError(null)
      try {
        const res = await fetch(`/api/agent-project-roles/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const err = await res.json()
          if (res.status === 422) {
            // Cycle detection trigger message
            setError(err.error ?? 'Esta relacion crearia un ciclo. Elige un agente diferente.')
          } else {
            setError(err.error ?? 'Error al actualizar el rol')
          }
          return null
        }
        const row: AgentProjectRoleRow = await res.json()
        return row
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al actualizar el rol')
        return null
      }
    },
    []
  )

  // Delete a role
  const deleteRole = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    try {
      const res = await fetch(`/api/agent-project-roles/${id}`, {
        method: 'DELETE',
      })
      if (res.status === 204) return true
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Error al eliminar el rol')
        return false
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el rol')
      return false
    }
  }, [])

  return { roles, loading, error, createRole, updateRole, deleteRole }
}
