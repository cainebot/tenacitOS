'use client'

import { useState, useMemo, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { createChannel } from '@/lib/chat'
import { toast } from 'sonner'

// ── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  participant_id: string
  display_name: string
  avatar_url: string | null
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useChannelCreation(
  existingChannelNames: string[],
  onCreated: (conversationId: string) => void
) {
  const [name, setName] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Agent[]>([])
  const [creating, setCreating] = useState(false)

  // Load agent list on mount
  useEffect(() => {
    const supabase = createBrowserClient()
    supabase
      .from('chat_participants')
      .select('participant_id, display_name, avatar_url')
      .eq('participant_type', 'agent')
      .order('display_name')
      .then(({ data }) => {
        if (data) setAgents(data as Agent[])
      })
  }, [])

  // Validation
  const nameError = useMemo(() => {
    if (!name.trim()) return null // don't show error for empty untouched
    const lower = name.trim().toLowerCase()
    if (existingChannelNames.some(n => n.toLowerCase() === lower)) {
      return 'A channel with this name already exists'
    }
    return null
  }, [name, existingChannelNames])

  const isValid = name.trim().length > 0 && !nameError && selectedMembers.length > 0

  const addMember = (agent: Agent) => {
    if (!selectedMembers.find(m => m.participant_id === agent.participant_id)) {
      setSelectedMembers(prev => [...prev, agent])
    }
  }

  const removeMember = (participantId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.participant_id !== participantId))
  }

  const handleCreate = async () => {
    if (!isValid) return
    setCreating(true)
    try {
      const conversationId = await createChannel(
        name.trim(),
        selectedMembers.map(m => m.participant_id)
      )
      onCreated(conversationId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create channel')
    } finally {
      setCreating(false)
    }
  }

  const availableAgents = agents.filter(
    a => !selectedMembers.find(m => m.participant_id === a.participant_id)
  )

  return {
    name,
    setName,
    nameError,
    agents: availableAgents,
    selectedMembers,
    addMember,
    removeMember,
    isValid,
    creating,
    handleCreate,
  }
}
