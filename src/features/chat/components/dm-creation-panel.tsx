'use client'

import { useState, useEffect } from 'react'
import { Button, Select } from '@circos/ui'
import { getOrCreateDirectConversation } from '@/lib/chat'
import { toast } from 'sonner'

// ── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  participant_id: string
  display_name: string
  avatar_url: string | null
  role: string
}

interface DmCreationPanelProps {
  onBack: () => void
  onConversationCreated: (conversationId: string) => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function DmCreationPanel({ onBack, onConversationCreated }: DmCreationPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Load agent participants on mount (service role bypasses RLS)
  useEffect(() => {
    fetch('/api/chat-participants?type=agent')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setAgents(data) })
      .catch(() => {})
  }, [])

  const handleCreate = async () => {
    if (!selectedAgentId) return
    setCreating(true)
    try {
      const conversationId = await getOrCreateDirectConversation(selectedAgentId)
      onConversationCreated(conversationId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open conversation')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[480px] mx-auto">
      <h2 className="text-lg font-semibold text-primary">New direct message</h2>

      {/* To field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-normal text-secondary">To</label>
        <Select.ComboBox
          placeholder="Search agents..."
          items={agents.map((a) => ({ id: a.participant_id, label: a.display_name, supportingText: a.role, avatarUrl: a.avatar_url ?? undefined }))}
          selectedKey={selectedAgentId}
          onSelectionChange={(key) => setSelectedAgentId(key as string)}
        >
          {(item) => (
            <Select.Item
              id={item.id}
              label={item.label}
              avatarUrl={item.avatarUrl}
              supportingText={item.supportingText}
            />
          )}
        </Select.ComboBox>
      </div>

      {/* CTAs */}
      <div className="flex items-center gap-3">
        <Button
          color="primary"
          size="md"
          isDisabled={!selectedAgentId || creating}
          isLoading={creating}
          onClick={handleCreate}
        >
          Open conversation
        </Button>
        <Button color="tertiary" size="md" onClick={onBack}>
          Back to conversations
        </Button>
      </div>
    </div>
  )
}
