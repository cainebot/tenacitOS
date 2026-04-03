'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { AgentRow } from '@/types/supabase'

export type AgentRowWithDept = AgentRow & {
  departments?: { display_name: string } | null
}

export interface UseRealtimeAgentsResult {
  agents: AgentRowWithDept[]
  loading: boolean
  error: string | null
  resync: () => Promise<void>
}

export function useRealtimeAgents(): UseRealtimeAgentsResult {
  const [agents, setAgents] = useState<AgentRowWithDept[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()
  const deptMapRef = useRef<Record<string, string>>({})

  const fetchAllAgents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase.from('agents').select('*, departments(display_name)')
      if (fetchError) {
        setError(fetchError.message)
      } else {
        const agentData = (data as AgentRowWithDept[]) ?? []
        setAgents(agentData)
        // Build dept lookup for Realtime payloads
        const map: Record<string, string> = {}
        agentData.forEach(a => {
          if (a.department_id && a.departments?.display_name) {
            map[a.department_id] = a.departments.display_name
          }
        })
        deptMapRef.current = map
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const resync = useCallback(async () => {
    await fetchAllAgents()
  }, [fetchAllAgents])

  useEffect(() => {
    // Full resync on mount before subscribing
    fetchAllAgents()

    const channel = supabase
      .channel('agents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => {
          const eventType = payload.eventType

          if (eventType === 'INSERT') {
            const newAgent = payload.new as AgentRowWithDept
            // Realtime payload lacks join data — patch from dept map
            if (newAgent.department_id && !newAgent.departments) {
              const displayName = deptMapRef.current[newAgent.department_id]
              if (displayName) {
                newAgent.departments = { display_name: displayName }
              }
            }
            setAgents((prev) => [...prev, newAgent])
          } else if (eventType === 'UPDATE') {
            const updatedAgent = payload.new as AgentRowWithDept
            // Realtime payload lacks join data — patch from dept map
            if (updatedAgent.department_id && !updatedAgent.departments) {
              const displayName = deptMapRef.current[updatedAgent.department_id]
              if (displayName) {
                updatedAgent.departments = { display_name: displayName }
              }
            }
            setAgents((prev) =>
              prev.map((a) => (a.agent_id === updatedAgent.agent_id ? updatedAgent : a))
            )
          } else if (eventType === 'DELETE') {
            const deletedAgent = payload.old as Pick<AgentRow, 'agent_id'>
            setAgents((prev) => prev.filter((a) => a.agent_id !== deletedAgent.agent_id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAllAgents, supabase])

  return { agents, loading, error, resync }
}
