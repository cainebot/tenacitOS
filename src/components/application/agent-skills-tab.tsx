'use client'

import { useEffect, useState } from 'react'
import {
  Badge,
  BadgeWithDot,
  Button,
  cx,
  FeaturedIcon,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Table,
  TableCard,
} from '@circos/ui'
import { Plus, SearchMd, Trash02, Zap } from '@untitledui/icons'
import { useAgentSkills } from '@/hooks/use-agent-skills'

interface AgentSkillsTabProps {
  agentId: string
}

interface CatalogSkill {
  id: string
  name: string
  description?: string
  icon?: string
  origin?: string
  latest_version?: { id: string; version: string } | null
}

type ToastState = { message: string; type: 'success' | 'error' } | null

function skillStatusColor(status: string): 'success' | 'indigo' | 'error' | 'gray' {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
    case 'installing':
      return 'indigo'
    case 'error':
      return 'error'
    default:
      return 'gray'
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function AgentSkillsTab({ agentId }: AgentSkillsTabProps) {
  const { skills, loading, refetch } = useAgentSkills(agentId)
  const [toast, setToast] = useState<ToastState>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [catalogSkills, setCatalogSkills] = useState<CatalogSkill[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [assigning, setAssigning] = useState<string | null>(null)

  // Filter soft-deleted skills from the visible list
  const visibleSkills = skills.filter((s) => s.desired_state !== 'absent')

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const duration = toast.type === 'success' ? 3000 : 5000
    const timer = setTimeout(() => setToast(null), duration)
    return () => clearTimeout(timer)
  }, [toast])

  // Fetch skill catalog when modal opens
  useEffect(() => {
    if (!showAssignModal) return
    setCatalogLoading(true)
    setSearchQuery('')
    fetch('/api/skills')
      .then((res) => res.json())
      .then((data) => setCatalogSkills(data.skills ?? []))
      .catch(() => setCatalogSkills([]))
      .finally(() => setCatalogLoading(false))
  }, [showAssignModal])

  // Installed skill IDs set for filtering catalog
  const installedIds = new Set(
    skills
      .filter((s) => s.desired_state !== 'absent')
      .map((s) => s.skill_id)
  )

  // Available catalog skills: not yet installed + filtered by search
  const availableSkills = catalogSkills
    .filter((s) => !installedIds.has(s.id))
    .filter(
      (s) =>
        searchQuery.trim() === '' ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

  async function handleRemove(skillId: string) {
    const res = await fetch(`/api/agents/${agentId}/skills?skill_id=${skillId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setToast({ message: 'Skill removed', type: 'success' })
      refetch()
    } else {
      setToast({ message: 'Failed to remove skill. Try again.', type: 'error' })
    }
  }

  async function handleAssign(skillId: string) {
    setAssigning(skillId)
    const res = await fetch(`/api/agents/${agentId}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill_id: skillId }),
    })
    setAssigning(null)
    if (res.ok) {
      setShowAssignModal(false)
      setToast({ message: 'Skill assigned', type: 'success' })
      refetch()
    } else {
      setToast({ message: 'Failed to assign skill. Try again.', type: 'error' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toast */}
      {toast && (
        <div
          className={cx(
            'rounded-lg border px-4 py-2 text-[14px]',
            toast.type === 'success'
              ? 'border-success-primary/20 bg-success-solid/10 text-success-primary'
              : 'border-error-primary/20 bg-error-solid/10 text-error-primary'
          )}
        >
          {toast.message}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-[600] text-secondary">Installed skills</span>
        <Button
          color="primary"
          iconLeading={Plus}
          size="sm"
          onClick={() => setShowAssignModal(true)}
        >
          Assign skill
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-secondary" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && visibleSkills.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <FeaturedIcon icon={<Zap />} color="gray" variant="light" size="lg" />
          <div className="text-center">
            <h3 className="text-[16px] font-[600] text-primary">No skills installed</h3>
            <p className="mt-1 text-[14px] text-tertiary">
              Assign skills to expand what this agent can do.
            </p>
          </div>
          <Button
            color="primary"
            iconLeading={Plus}
            size="sm"
            onClick={() => setShowAssignModal(true)}
          >
            Assign skill
          </Button>
        </div>
      )}

      {/* Skills table */}
      {!loading && visibleSkills.length > 0 && (
        <TableCard.Root size="md" className="w-full">
          <Table aria-label="Installed skills" className="w-full">
            <Table.Header>
              <Table.Head id="name" isRowHeader>
                <span className="text-xs font-medium text-quaternary">Name</span>
              </Table.Head>
              <Table.Head id="version">
                <span className="text-xs font-medium text-quaternary">Version</span>
              </Table.Head>
              <Table.Head id="status">
                <span className="text-xs font-medium text-quaternary">Status</span>
              </Table.Head>
              <Table.Head id="actions">
                <span className="sr-only">Actions</span>
              </Table.Head>
            </Table.Header>
            <Table.Body>
              {visibleSkills.map((skill) => (
                <Table.Row key={skill.skill_id}>
                  <Table.Cell>
                    <span className="text-[14px] text-primary">
                      {skill.skills?.name ?? 'Unknown'}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-[14px] text-tertiary">
                      {skill.skill_versions?.version ?? '\u2014'}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <BadgeWithDot
                      color={skillStatusColor(skill.status)}
                      size="sm"
                      type="pill-color"
                    >
                      {capitalize(skill.status)}
                    </BadgeWithDot>
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      color="secondary-destructive"
                      iconLeading={Trash02}
                      size="sm"
                      onClick={() => handleRemove(skill.skill_id)}
                    >
                      Remove
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </TableCard.Root>
      )}

      {/* Assign Skill Modal */}
      <Modal
        isOpen={showAssignModal}
        onOpenChange={setShowAssignModal}
        size="md"
        isDismissable
      >
        <ModalHeader>Assign a skill</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              icon={SearchMd}
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(v) => setSearchQuery(v)}
            />

            {/* Catalog loading skeletons */}
            {catalogLoading && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-secondary" />
                ))}
              </div>
            )}

            {/* Empty search result */}
            {!catalogLoading && availableSkills.length === 0 && (
              <p className="text-center text-[14px] text-tertiary py-4">
                {searchQuery.trim() !== ''
                  ? 'No matching skills found'
                  : 'All available skills are already installed'}
              </p>
            )}

            {/* Available skills list */}
            {!catalogLoading && availableSkills.length > 0 && (
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                {availableSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-secondary p-3"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] text-primary">{skill.name}</span>
                        {skill.latest_version && (
                          <Badge color="gray" size="sm">
                            v{skill.latest_version.version}
                          </Badge>
                        )}
                      </div>
                      {skill.description && (
                        <span className="truncate text-[12px] text-quaternary">
                          {skill.description.slice(0, 80)}
                          {skill.description.length > 80 ? '\u2026' : ''}
                        </span>
                      )}
                    </div>
                    <Button
                      color="primary"
                      size="sm"
                      isLoading={assigning === skill.id}
                      isDisabled={assigning !== null && assigning !== skill.id}
                      onClick={() => handleAssign(skill.id)}
                    >
                      Assign
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" size="sm" onClick={() => setShowAssignModal(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
