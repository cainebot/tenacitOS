'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { PUBLISHED_MAP_ID } from '../../constants'

interface ZoneBinding {
  binding_id: string
  zone_id: string
  agent_id: string | null
  project_id: string | null
  board_id: string | null
  label: string | null
  color: string | null
  zone_type: 'desk' | 'office' | 'room'
  room_capability: string | null
}

export function useZoneBindingsWrite(zoneId: string | null) {
  const [binding, setBinding] = useState<ZoneBinding | null>(null)
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([])
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [boards, setBoards] = useState<Array<{ id: string; name: string; project_id: string | null }>>([])
  const [allBindings, setAllBindings] = useState<ZoneBinding[]>([])
  const [saving, setSaving] = useState(false)

  // Fetch binding + reference data when zoneId changes
  useEffect(() => {
    if (!zoneId) {
      setBinding(null)
      return
    }

    const supabase = createBrowserClient()

    // Fetch binding for this zone — create a local stub if none exists in DB
    supabase
      .from('office_zone_bindings')
      .select('*')
      .eq('zone_id', zoneId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBinding(data as ZoneBinding)
        } else {
          // No binding row for this zone yet — create a local stub
          // The API route will upsert on first field update
          setBinding({
            binding_id: '',
            zone_id: zoneId,
            agent_id: null,
            project_id: null,
            board_id: null,
            label: null,
            color: null,
            zone_type: 'desk',
            room_capability: null,
          })
        }
      })

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

    // Fetch available boards
    supabase
      .from('boards')
      .select('board_id, name, project_id')
      .then(({ data }) =>
        setBoards((data ?? []).map((b: { board_id: string; name: string; project_id: string | null }) => ({
          id: b.board_id,
          name: b.name,
          project_id: b.project_id,
        })))
      )

    // Fetch all bindings for uniqueness validation
    supabase
      .from('office_zone_bindings')
      .select('binding_id, zone_id, agent_id, project_id, board_id, label, color, zone_type, room_capability')
      .then(({ data }) => setAllBindings((data ?? []) as ZoneBinding[]))
  }, [zoneId])

  const updateBinding = useCallback(
    async (field: 'agent_id' | 'project_id' | 'zone_type' | 'board_id' | 'room_capability', value: string | null) => {
      if (!zoneId) return
      setSaving(true)
      try {
        const body: Record<string, unknown> = { zoneId, mapId: PUBLISHED_MAP_ID }
        if (field === 'agent_id') body.agentId = value
        if (field === 'project_id') body.projectId = value
        if (field === 'zone_type') body.zoneType = value
        if (field === 'board_id') body.boardId = value
        if (field === 'room_capability') body.roomCapability = value
        await fetch('/api/office/zone-bindings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        setBinding((prev) => (prev ? { ...prev, [field]: value } : prev))
        // Update allBindings cache after successful save
        setAllBindings((prev) =>
          prev.map((b) => (b.zone_id === zoneId ? { ...b, [field]: value } : b))
        )
      } finally {
        setSaving(false)
      }
    },
    [zoneId],
  )

  return { binding, agents, projects, boards, allBindings, updateBinding, saving }
}
