'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, Badge, BadgeWithDot, Button, Modal, ModalHeader, ModalBody, ModalFooter, cx } from '@circos/ui'
import { ChevronLeft, Trash02 } from '@untitledui/icons'
import type { AgentRow } from '@/types/supabase'
import { agentStatusColor } from '@/lib/agent-status-color'

interface AgentDetailSummaryBarProps {
  agent: AgentRow
  onDelete: () => void
  isDeleting: boolean
}

export function AgentDetailSummaryBar({ agent, onDelete, isDeleting }: AgentDetailSummaryBarProps) {
  const router = useRouter()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deptName = (agent as AgentRow & { departments?: { display_name: string } }).departments?.display_name

  const handleDeleteConfirm = async () => {
    setDeleteError(null)
    const res = await fetch(`/api/agents/${agent.agent_id}`, { method: 'DELETE' })
    if (res.status === 409) {
      const data = await res.json()
      setDeleteError(`Cannot delete — ${data.active_task_count} active task(s) in progress.`)
      return
    }
    if (!res.ok) {
      setDeleteError('Failed to delete agent. Try again.')
      return
    }
    setShowDeleteModal(false)
    onDelete()
    router.push('/agents')
  }

  const handleOpenModal = () => {
    setDeleteError(null)
    setShowDeleteModal(true)
  }

  return (
    <>
      <div className={cx(
        'flex items-center gap-4 bg-secondary border-b border-secondary px-8 py-4 w-full'
      )}>
        {/* Breadcrumb back button */}
        <Button
          color="link-gray"
          iconLeading={ChevronLeft}
          size="sm"
          onClick={() => router.push('/agents')}
        >
          Agents
        </Button>

        {/* Divider */}
        <div className="h-4 w-px bg-tertiary" />

        {/* Avatar */}
        <Avatar
          size="lg"
          initials={agent.emoji}
          status={agent.status === 'offline' ? 'offline' : 'online'}
        />

        {/* Name + status + role */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] font-[600] font-sora text-primary tracking-tight leading-tight">
              {agent.name}
            </h1>
            <BadgeWithDot
              color={agentStatusColor(agent.status)}
              size="sm"
              type="pill-color"
            >
              {agent.status}
            </BadgeWithDot>
          </div>
          {agent.role && (
            <p className="text-[14px] text-tertiary">{agent.role}</p>
          )}
        </div>

        {/* Metadata badges */}
        <div className="flex items-center gap-2 ml-2">
          <Badge color="gray" size="sm">{agent.node_id}</Badge>
          {deptName && (
            <Badge color="gray" size="sm">{deptName}</Badge>
          )}
          {agent.avatar_model && (
            <Badge color="gray" size="sm">{agent.avatar_model}</Badge>
          )}
        </div>

        {/* Delete button — pushed to right */}
        <div className="ml-auto">
          <Button
            color="primary-destructive"
            iconLeading={Trash02}
            size="sm"
            isLoading={isDeleting}
            onClick={handleOpenModal}
          >
            Delete agent
          </Button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteModal(false)
            setDeleteError(null)
          }
        }}
        size="sm"
      >
        <ModalHeader>Delete {agent.name}?</ModalHeader>
        <ModalBody>
          <p className="text-[14px] text-secondary">
            This will permanently remove the agent and unassign all their cards. This action cannot be undone.
          </p>
          {deleteError && (
            <p className="mt-3 text-[14px] text-error-primary">
              {deleteError}
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="secondary"
            size="sm"
            onClick={() => {
              setShowDeleteModal(false)
              setDeleteError(null)
            }}
          >
            Keep agent
          </Button>
          <Button
            color="primary-destructive"
            size="sm"
            isLoading={isDeleting}
            onClick={handleDeleteConfirm}
          >
            Delete agent
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
