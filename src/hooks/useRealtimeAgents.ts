'use client'

import { useCallback, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { AgentRow } from '@/types/supabase'

export interface UseRealtimeAgentsResult {
  agents: AgentRow[]
  loading: boolean
  error: string | null
  resync: () => Promise<void>
}

export function useRealtimeAgents(): UseRealtimeAgentsResult {
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  const fetchAllAgents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase.from('agents').select('*')
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setAgents((data as AgentRow[]) ?? [])
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

    // ME-03 — mount-unique topic so StrictMode's dev-only double-mount does
    // not collide with an already-subscribed channel (matches the pattern
    // used by useRealtimeRuns / useInstructionFiles).
    const topic = `agents-realtime-${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => {
          const eventType = payload.eventType

          if (eventType === 'INSERT') {
            const newAgent = payload.new as AgentRow
            setAgents((prev) => [...prev, newAgent])
          } else if (eventType === 'UPDATE') {
            const updatedAgent = payload.new as AgentRow
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
