'use client'

import { useCallback, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { AgentSkillRow, SkillRow, SkillVersionRow } from '@/types/supabase'

export interface AgentSkillWithDetails extends AgentSkillRow {
  skills: Pick<SkillRow, 'id' | 'name' | 'description' | 'icon' | 'origin'> | null
  skill_versions: Pick<SkillVersionRow, 'id' | 'version' | 'content'> | null
}

export interface UseAgentSkillsResult {
  skills: AgentSkillWithDetails[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAgentSkills(id: string): UseAgentSkillsResult {
  const [skills, setSkills] = useState<AgentSkillWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  const fetchSkills = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/agents/${id}/skills`)
      if (!response.ok) {
        setError(`Failed to fetch skills: ${response.statusText}`)
        return
      }
      const data = await response.json()
      setSkills(data.agent_skills ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent skills')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchSkills()

    const channel = supabase
      .channel(`agent-skills-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_skills', filter: `agent_id=eq.${id}` },
        () => {
          // On ANY event, refetch all skills — Realtime payload doesn't include joins
          fetchSkills()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchSkills, supabase, id])

  return { skills, loading, error, refetch: fetchSkills }
}
