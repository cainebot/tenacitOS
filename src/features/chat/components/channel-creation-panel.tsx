'use client'

import { Avatar, BadgeWithButton, Button, Input, Select } from '@circos/ui'
import { useChannelCreation } from '../hooks/use-channel-creation'

// ── Types ────────────────────────────────────────────────────────────────────

interface ChannelCreationPanelProps {
  existingChannelNames: string[]
  onBack: () => void
  onChannelCreated: (conversationId: string) => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChannelCreationPanel({
  existingChannelNames,
  onBack,
  onChannelCreated,
}: ChannelCreationPanelProps) {
  const {
    name,
    setName,
    nameError,
    agents,
    selectedMembers,
    addMember,
    removeMember,
    isValid,
    creating,
    handleCreate,
  } = useChannelCreation(existingChannelNames, onChannelCreated)

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[480px] mx-auto">
      <h2 className="text-lg font-semibold text-primary">New channel</h2>

      {/* Channel name field */}
      <Input
        label="Channel name"
        placeholder="e.g. team-updates"
        isRequired
        value={name}
        onChange={setName}
        isInvalid={!!nameError}
        hint={nameError ?? ''}
      />

      {/* Members field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-normal text-secondary">Members</label>

        {/* Selected member chips */}
        {selectedMembers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedMembers.map((member) => (
              <BadgeWithButton
                key={member.participant_id}
                color="brand"
                size="md"
                onButtonClick={() => removeMember(member.participant_id)}
                buttonLabel={`Remove ${member.display_name}`}
              >
                {member.display_name}
              </BadgeWithButton>
            ))}
          </div>
        )}

        {/* Agent search/select */}
        <Select.ComboBox
          placeholder="Search agents..."
          items={agents.map((a) => ({
            id: a.participant_id,
            label: a.display_name,
            avatarUrl: a.avatar_url ?? undefined,
          }))}
          onSelectionChange={(key) => {
            const agent = agents.find(a => a.participant_id === key)
            if (agent) addMember(agent)
          }}
        >
          {(item) => (
            <Select.Item id={item.id} textValue={item.label}>
              <div className="flex items-center gap-2">
                {item.avatarUrl ? (
                  <Avatar size="sm" src={item.avatarUrl} alt={item.label ?? ''} />
                ) : (
                  <Avatar size="sm" alt={item.label ?? ''} />
                )}
                <span className="text-sm text-secondary">{item.label}</span>
              </div>
            </Select.Item>
          )}
        </Select.ComboBox>
      </div>

      {/* CTAs */}
      <div className="flex items-center gap-3">
        <Button
          color="primary"
          size="md"
          isDisabled={!isValid || creating}
          isLoading={creating}
          onClick={handleCreate}
        >
          Create channel
        </Button>
        <Button color="tertiary" size="md" onClick={onBack}>
          Back to conversations
        </Button>
      </div>
    </div>
  )
}
