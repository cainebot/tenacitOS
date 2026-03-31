'use client'

import { useCallback, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { AgentRow } from '@/types/supabase'

export interface UseAgentResult {
  agent: AgentRow | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAgent(id: string): UseAgentResult {
  const [agent, setAgent] = useState<AgentRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  const fetchAgent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('agents')
        .select('*, departments(display_name, color, icon, objective)')
        .eq('agent_id', id)
        .single()
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setAgent(data as AgentRow)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent')
    } finally {
      setLoading(false)
    }
  }, [supabase, id])

  useEffect(() => {
    fetchAgent()

    const channel = supabase
      .channel(`agent-detail-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents', filter: `agent_id=eq.${id}` },
        (payload) => {
          const eventType = payload.eventType
          if (eventType === 'UPDATE') {
            setAgent(payload.new as AgentRow)
          } else if (eventType === 'DELETE') {
            setAgent(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAgent, supabase, id])

  return { agent, loading, error, refetch: fetchAgent }
}
