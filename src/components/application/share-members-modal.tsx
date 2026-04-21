'use client'

// EXCEPTION D-22: centered modal uses backdrop-blur-md (different from side panels per MEMORY.md rule)
import { useState } from 'react'
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  AvatarLabelGroup,
  Select,
  FeaturedIcon,
  cx,
} from '@circos/ui'
import { UsersPlus, Copy01 } from '@untitledui/icons'
import { toast } from 'sonner'
import type { ProjectMember } from '@/types/project'
import type { AgentRow } from '@/types/supabase'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ShareMembersModalProps {
  isOpen: boolean
  onClose: () => void
  members: ProjectMember[]
  agents: AgentRow[]
  projectId: string
  onMemberAdd: (memberId: string, type: 'user' | 'agent') => void
  onMemberRoleChange: (memberId: string, role: 'admin' | 'editor' | 'viewer') => void
}

// ---------------------------------------------------------------------------
// MemberRole type
// ---------------------------------------------------------------------------

type MemberRole = 'admin' | 'editor' | 'viewer'

// SelectItemType uses `label` not `name`
const ROLE_ITEMS: { id: MemberRole; label: string }[] = [
  { id: 'admin', label: 'Admin' },
  { id: 'editor', label: 'Editor' },
  { id: 'viewer', label: 'Viewer' },
]

// ---------------------------------------------------------------------------
// ShareMembersModal
// ---------------------------------------------------------------------------

export function ShareMembersModal({
  isOpen,
  onClose,
  members,
  agents,
  onMemberAdd,
  onMemberRoleChange,
}: ShareMembersModalProps) {
  // Local per-member role state (D-25: stored but not enforced)
  const [memberRoles, setMemberRoles] = useState<Record<string, MemberRole>>(() => {
    const initial: Record<string, MemberRole> = {}
    members.forEach((m) => { initial[m.id] = 'editor' })
    return initial
  })

  const handleRoleChange = (memberId: string, role: MemberRole) => {
    setMemberRoles((prev) => ({ ...prev, [memberId]: role }))
    onMemberRoleChange(memberId, role)
  }

  // Agents not yet members
  const availableAgents = agents.filter(
    (a) => !members.some((m) => m.id === a.agent_id)
  )

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      isDismissable
      size="sm"
      className={cx(
        'max-w-[400px] rounded-2xl shadow-xl',
      )}
    >
      <ModalHeader className="flex flex-col items-center gap-4 border-b-0 pb-0">
        <FeaturedIcon icon={<UsersPlus />} color="brand" variant="light" size="lg" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-primary">Share with people</h2>
          <p className="text-sm text-tertiary mt-1">
            The following users have access to this project:
          </p>
        </div>
      </ModalHeader>

      <ModalBody>
        {/* Member rows */}
        <div className="space-y-3">
          {members.length === 0 ? (
            <p className="text-sm text-tertiary py-2">No members yet. Add a team member below.</p>
          ) : (
            members.map((member) => {
              const agent = agents.find((a) => a.agent_id === member.id)
              const displayName = agent?.name ?? member.name
              const initials = displayName.trim()
                ? displayName.trim().split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                : '?'
              const currentRole = memberRoles[member.id] ?? 'editor'

              return (
                <div key={member.id} className="flex items-center gap-3">
                  <AvatarLabelGroup
                    initials={initials}
                    title={displayName}
                    subtitle={member.type === 'agent' ? 'AI Agent' : 'Team member'}
                    size="md"
                    className="flex-1 min-w-0"
                  />
                  <Select
                    size="sm"
                    selectedKey={currentRole}
                    onSelectionChange={(key) => handleRoleChange(member.id, key as MemberRole)}
                    items={ROLE_ITEMS}
                    aria-label={`Role for ${displayName}`}
                  >
                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                  </Select>
                </div>
              )
            })
          )}
        </div>

        {/* Add team member selector */}
        {availableAgents.length > 0 && (
          <div className="mt-4">
            <Select
              label="Team member"
              placeholder="Select team member"
              items={availableAgents.map((a) => ({ id: a.agent_id, label: a.name }))}
              onSelectionChange={(key) => {
                if (key) {
                  onMemberAdd(key as string, 'agent')
                  // Add default role for new member
                  setMemberRoles((prev) => ({ ...prev, [key as string]: 'editor' }))
                }
              }}
            >
              {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <div className={cx('flex items-center justify-between w-full')}>
          {/* Copy link per D-26 — placeholder: copies project URL to clipboard */}
          <Button
            color="secondary"
            size="md"
            iconLeading={Copy01}
            onPress={() => {
              navigator.clipboard.writeText(window.location.href).then(() => {
                toast.success('Link copied to clipboard')
              }).catch(() => {
                toast.error('Failed to copy link')
              })
            }}
          >
            Copy link
          </Button>
          <Button color="primary" size="md" onPress={onClose}>
            Done
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}
