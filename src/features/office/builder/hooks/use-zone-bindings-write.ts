'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'

interface ZoneBinding {
  binding_id: string
  zone_id: string
  agent_id: string | null
  project_id: string | null
  board_id: string | null
  label: string | null
  color: string | null
}

export function useZoneBindingsWrite(zoneId: string | null) {
  const [binding, setBinding] = useState<ZoneBinding | null>(null)
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([])
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [saving, setSaving] = useState(false)

  // Fetch binding + reference data when zoneId changes
  useEffect(() => {
    if (!zoneId) {
      setBinding(null)
      return
    }

    const supabase = createBrowserClient()

    // Fetch binding for this zone
    supabase
      .from('office_zone_bindings')
      .select('*')
      .eq('zone_id', zoneId)
      .maybeSingle()
      .then(({ data }) => setBinding(data as ZoneBinding | null))

    // Fetch available agents
    supabase
      .from('agents')
      .select('agent_id, name')
      .then(({ data }) =>
        setAgents((data ?? []).map((a: { agent_id: string; name: string }) => ({ id: a.agent_id, name: a.name })))
      )

    // Fetch available projects
    supabase
      .from('projects')
      .select('id, name')
      .then(({ data }) =>
        setProjects((data ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
      )
  }, [zoneId])

  const updateBinding = useCallback(
    async (field: 'agent_id' | 'project_id', value: string | null) => {
      if (!zoneId) return
      setSaving(true)
      try {
        const body: Record<string, unknown> = { zoneId }
        if (field === 'agent_id') body.agentId = value
        if (field === 'project_id') body.projectId = value
        await fetch('/api/office/zone-bindings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        setBinding((prev) => (prev ? { ...prev, [field]: value } : prev))
      } finally {
        setSaving(false)
      }
    },
    [zoneId],
  )

  return { binding, agents, projects, updateBinding, saving }
}
