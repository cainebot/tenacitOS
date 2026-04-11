'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  TextEditor,
  Button,
  Badge,
  BadgeWithDot,
  AvatarLabelGroup,
  Avatar,
  Dropdown,
  ModalForm,
  FeaturedIcon,
  Input,
  cx,
} from '@circos/ui'
import { Target04, Users01, Plus, Edit03, Trash01 } from '@untitledui/icons'
import { Button as AriaButton } from 'react-aria-components'
import { useGoals } from '@/hooks/use-goals'
import { useAgentProjectRoles } from '@/hooks/use-agent-project-roles'
import { createBrowserClient } from '@/lib/supabase'
import { toast } from 'sonner'
import type { AgentRow } from '@/types/supabase'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectOverviewTabProps {
  projectId: string
  boardId: string
  description: string | null
  onDescriptionChange: (desc: string) => void
  agents: AgentRow[]
  projectLeadAgentId: string | null
}

// ---------------------------------------------------------------------------
// ProjectOverviewTab
// ---------------------------------------------------------------------------

export function ProjectOverviewTab({
  projectId,
  boardId,
  description,
  onDescriptionChange,
  agents,
  projectLeadAgentId,
}: ProjectOverviewTabProps) {
  const router = useRouter()

  // ---------------------------------------------------------------------------
  // Description section — debounced auto-save
  // ---------------------------------------------------------------------------

  const descTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDescriptionChange = useCallback(
    (content: string) => {
      onDescriptionChange(content)
      if (descTimerRef.current) clearTimeout(descTimerRef.current)
      descTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: content }),
          })
          if (!res.ok) throw new Error('Save failed')
        } catch {
          toast.error('Failed to save description. Try again.')
        }
      }, 800)
    },
    [projectId, onDescriptionChange]
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (descTimerRef.current) clearTimeout(descTimerRef.current)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Members section
  // ---------------------------------------------------------------------------

  const { roles, createRole, updateRole, deleteRole } = useAgentProjectRoles(projectId)

  // Track which role row is showing inline role input
  const [addingRoleForId, setAddingRoleForId] = useState<string | null>(null)
  const [roleInputValue, setRoleInputValue] = useState('')

  // Local optimistic PL state (syncs from props initially)
  const [localPlAgentId, setLocalPlAgentId] = useState<string | null>(projectLeadAgentId)
  useEffect(() => {
    setLocalPlAgentId(projectLeadAgentId)
  }, [projectLeadAgentId])

  const handleSetProjectLead = useCallback(
    async (agentId: string) => {
      const previousPl = localPlAgentId
      setLocalPlAgentId(agentId) // optimistic

      try {
        const res = await fetch(`/api/boards/${boardId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_lead_agent_id: agentId }),
        })
        if (!res.ok) {
          setLocalPlAgentId(previousPl)
          toast.error('Failed to update Project Lead.')
          return
        }

        // Mark both old and new PL as soul_dirty
        try {
          const supabase = createBrowserClient()
          const dirtyIds = [previousPl, agentId].filter(Boolean) as string[]
          if (dirtyIds.length > 0) {
            const { error } = await supabase
              .from('agents')
              .update({ soul_dirty: true })
              .in('agent_id', dirtyIds)
            if (error) {
              // Fallback: PATCH /api/agents for each
              for (const id of dirtyIds) {
                await fetch(`/api/agents/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ soul_dirty: true }),
                }).catch(() => {})
              }
            }
          }
        } catch {
          // soul_dirty update is non-critical — don't fail the whole operation
        }

        toast.success('Project Lead updated.')
      } catch {
        setLocalPlAgentId(previousPl)
        toast.error('Failed to update Project Lead.')
      }
    },
    [boardId, localPlAgentId]
  )

  const handleRemoveProjectLead = useCallback(async () => {
    const previousPl = localPlAgentId
    setLocalPlAgentId(null) // optimistic
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_lead_agent_id: null }),
      })
      if (!res.ok) {
        setLocalPlAgentId(previousPl)
        toast.error('Failed to remove Project Lead.')
        return
      }
      // Mark old PL as soul_dirty
      if (previousPl) {
        try {
          const supabase = createBrowserClient()
          await supabase.from('agents').update({ soul_dirty: true }).eq('agent_id', previousPl)
        } catch {
          await fetch(`/api/agents/${previousPl}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ soul_dirty: true }),
          }).catch(() => {})
        }
      }
      toast.success('Project Lead removed.')
    } catch {
      setLocalPlAgentId(previousPl)
      toast.error('Failed to remove Project Lead.')
    }
  }, [boardId, localPlAgentId])

  const handleRemoveMember = useCallback(
    async (roleId: string, agentName: string) => {
      const success = await deleteRole(roleId)
      if (success) {
        toast.success(`Removed ${agentName} from project.`)
      } else {
        toast.error('Failed to remove member.')
      }
    },
    [deleteRole]
  )

  const handleSaveRole = useCallback(
    async (roleId: string) => {
      const title = roleInputValue.trim()
      if (!title) return
      await updateRole(roleId, { title })
      setAddingRoleForId(null)
      setRoleInputValue('')
    },
    [updateRole, roleInputValue]
  )

  // Add Member modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')

  const existingAgentIds = new Set(roles.map((r) => r.agent_id))
  const filteredAgents = agents.filter(
    (a) =>
      !existingAgentIds.has(a.agent_id) &&
      a.name.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const handleAddMember = useCallback(
    async (agentId: string) => {
      const result = await createRole({ agent_id: agentId, project_id: projectId })
      if (!result) {
        toast.error('Failed to add member. They may already be in this project.')
      }
    },
    [createRole, projectId]
  )

  // ---------------------------------------------------------------------------
  // Goals section
  // ---------------------------------------------------------------------------

  const { departmentGoals, createGoal, deleteGoal } = useGoals(projectId)

  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [goalDescInput, setGoalDescInput] = useState('')
  const goalInputRef = useRef<HTMLInputElement>(null)
  const goalDescRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (showGoalForm) {
      // Short delay so the input is mounted before focus
      setTimeout(() => goalInputRef.current?.focus(), 50)
    }
  }, [showGoalForm])

  const handleAddGoalClick = useCallback(() => {
    setShowGoalForm(true)
    setGoalInput('')
    setGoalDescInput('')
  }, [])

  const handleGoalSave = useCallback(async () => {
    const title = goalInput.trim()
    if (!title) return
    const result = await createGoal({
      title,
      description: goalDescInput.trim() || undefined,
      level: 'department',
      project_id: projectId,
    })
    if (!result) {
      toast.error('Failed to create goal. Try again.')
      return
    }
    setShowGoalForm(false)
    setGoalInput('')
    setGoalDescInput('')
  }, [goalInput, goalDescInput, createGoal, projectId])

  const handleGoalKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        // Move focus to description field instead of saving immediately
        goalDescRef.current?.focus()
      } else if (e.key === 'Escape') {
        setShowGoalForm(false)
        setGoalInput('')
        setGoalDescInput('')
      }
    },
    []
  )

  const handleGoalDescKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleGoalSave()
      } else if (e.key === 'Escape') {
        setShowGoalForm(false)
        setGoalInput('')
        setGoalDescInput('')
      }
    },
    [handleGoalSave]
  )

  // Helper: get agent initials from name
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-3xl mx-auto space-y-0">

      {/* ====================================================================
          Section 1: Description
          ==================================================================== */}
      <section className="py-6">
        <h3 className="font-display text-base font-semibold text-primary mb-3">
          Description
        </h3>
        <TextEditor
          content={description ?? ''}
          onContentChange={handleDescriptionChange}
          placeholder="What is this project about?"
        />
      </section>

      {/* Divider */}
      <div className="h-px bg-border-secondary" />

      {/* ====================================================================
          Section 2: Members ("Roles en el proyecto") — moved before Goals
          ==================================================================== */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users01 className="size-5 text-fg-secondary" />
            <h3 className="font-display text-base font-semibold text-primary">Roles en el proyecto</h3>
          </div>
          <Button
            color="secondary"
            size="sm"
            iconLeading={Plus}
            onClick={() => {
              setShowAddMemberModal(true)
              setMemberSearch('')
            }}
          >
            Add member
          </Button>
        </div>

        {/* Member list or empty state */}
        {roles.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <FeaturedIcon icon={<Users01 />} variant="light" size="md" />
            <p className="font-display text-base font-semibold text-primary">No members assigned</p>
            <p className="text-xs text-tertiary">
              Add agents or team members to collaborate on this project.
            </p>
          </div>
        ) : (
          <div>
            {/* Table header row — Jira Personas style */}
            <div className="flex items-center gap-3 px-2 py-1.5 border-b border-secondary">
              <span className="flex-1 text-xs font-medium text-tertiary">Name</span>
              <span className="text-xs font-medium text-tertiary">Role</span>
            </div>

            {/* Member rows */}
            {roles.map((role, index) => {
              const agent = agents.find((a) => a.agent_id === role.agent_id)
              const isProjectLead = role.agent_id === localPlAgentId
              const agentName = agent?.name ?? 'Unknown'
              const agentRole = agent?.role ?? ''
              const isLast = index === roles.length - 1

              return (
                <div key={role.id}>
                  <Dropdown.Root>
                    <AriaButton className="w-full text-left">
                      <div className={cx(
                        'flex items-center gap-3 py-2 px-2 hover:bg-secondary cursor-pointer min-h-[44px]',
                        !isLast && 'border-b border-secondary/50'
                      )}>
                        <AvatarLabelGroup
                          src={undefined}
                          initials={getInitials(agentName)}
                          title={agentName}
                          subtitle={role.title ?? agentRole}
                          size="sm"
                        />
                        <div className="ml-auto shrink-0">
                          {isProjectLead ? (
                            <BadgeWithDot color="brand" type="pill-color">
                              Project Lead
                            </BadgeWithDot>
                          ) : (
                            <BadgeWithDot color="gray" type="pill-color">
                              Member
                            </BadgeWithDot>
                          )}
                        </div>
                      </div>
                    </AriaButton>
                    <Dropdown.Popover>
                      <Dropdown.Menu>
                        <Dropdown.Item
                          label="Add role"
                          onAction={() => {
                            setAddingRoleForId(role.id)
                            setRoleInputValue(role.title ?? '')
                          }}
                        />
                        {isProjectLead ? (
                          <Dropdown.Item
                            label="Remove Project Lead"
                            onAction={() => handleRemoveProjectLead()}
                          />
                        ) : (
                          <Dropdown.Item
                            label="Set as Project Lead"
                            onAction={() => handleSetProjectLead(role.agent_id)}
                          />
                        )}
                        <Dropdown.Item
                          label="Remove from project"
                          onAction={() => handleRemoveMember(role.id, agentName)}
                          className="text-error-primary"
                        />
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown.Root>

                  {/* Inline role title input */}
                  {addingRoleForId === role.id && (
                    <div className="flex items-center gap-2 mt-1 mb-1 px-2">
                      <input
                        type="text"
                        value={roleInputValue}
                        onChange={(e) => setRoleInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleSaveRole(role.id)
                          } else if (e.key === 'Escape') {
                            setAddingRoleForId(null)
                            setRoleInputValue('')
                          }
                        }}
                        placeholder="Enter role title..."
                        className={cx(
                          'flex-1 rounded-md border border-primary bg-primary px-3 py-1.5 text-sm text-primary placeholder:text-placeholder',
                          'focus:outline-none focus:ring-1 focus:ring-brand'
                        )}
                        autoFocus
                      />
                      <Button color="primary" size="sm" onClick={() => handleSaveRole(role.id)}>
                        Save
                      </Button>
                      <Button
                        color="secondary"
                        size="sm"
                        onClick={() => {
                          setAddingRoleForId(null)
                          setRoleInputValue('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="h-px bg-border-secondary" />

      {/* ====================================================================
          Section 3: Goals — moved after Members
          ==================================================================== */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target04 className="size-5 text-fg-secondary" />
            <h3 className="font-display text-base font-semibold text-primary">Goals</h3>
          </div>
          {!showGoalForm && (
            <Button
              color="secondary"
              size="sm"
              iconLeading={Plus}
              onClick={handleAddGoalClick}
            >
              Add goal
            </Button>
          )}
        </div>

        {/* Goal list or empty state */}
        {departmentGoals.length === 0 && !showGoalForm ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <FeaturedIcon icon={<Target04 />} variant="light" size="md" />
            <p className="font-display text-base font-semibold text-primary">No goals yet</p>
            <p className="text-xs text-tertiary">
              Create a goal to align this project with team objectives.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {departmentGoals.map((goal) => (
              <div
                key={goal.goal_id}
                className="group flex items-center gap-2 py-2 px-2 rounded-md hover:bg-secondary"
              >
                <Badge color="gray" size="sm">Department</Badge>
                <span
                  className="flex-1 text-sm text-primary cursor-pointer truncate"
                  onClick={() => router.push(`/goals/${goal.goal_id}`)}
                >
                  {goal.title}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <AriaButton
                    aria-label="Edit goal"
                    className="rounded p-0.5 text-fg-quaternary hover:text-fg-secondary transition-colors"
                    onPress={() => router.push(`/goals/${goal.goal_id}`)}
                  >
                    <Edit03 className="size-4" />
                  </AriaButton>
                  <AriaButton
                    aria-label="Delete goal"
                    className="rounded p-0.5 text-fg-error-primary hover:text-error-primary transition-colors"
                    onPress={async () => {
                      const ok = await deleteGoal(goal.goal_id)
                      if (!ok) toast.error('Failed to delete goal.')
                    }}
                  >
                    <Trash01 className="size-4" />
                  </AriaButton>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inline goal creation form — vertical layout with title + description */}
        {showGoalForm && (
          <div className="flex flex-col gap-2 mt-2 px-2">
            <input
              ref={goalInputRef}
              type="text"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={handleGoalKeyDown}
              placeholder="Goal name..."
              className={cx(
                'w-full rounded-md border border-primary bg-primary px-3 py-1.5 text-sm text-primary placeholder:text-placeholder',
                'focus:outline-none focus:ring-1 focus:ring-brand'
              )}
            />
            <textarea
              ref={goalDescRef}
              value={goalDescInput}
              onChange={(e) => setGoalDescInput(e.target.value)}
              onKeyDown={handleGoalDescKeyDown}
              placeholder="Goal description (optional)..."
              rows={2}
              className={cx(
                'w-full rounded-md border border-primary bg-primary px-3 py-1.5 text-sm text-primary placeholder:text-placeholder',
                'focus:outline-none focus:ring-1 focus:ring-brand resize-none'
              )}
            />
            <div className="flex items-center gap-2">
              <Button color="primary" size="sm" onClick={handleGoalSave}>
                Save Goal
              </Button>
              <Button
                color="secondary"
                size="sm"
                onClick={() => {
                  setShowGoalForm(false)
                  setGoalInput('')
                  setGoalDescInput('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ====================================================================
          Add Member Modal
          ==================================================================== */}
      <ModalForm
        isOpen={showAddMemberModal}
        onOpenChange={setShowAddMemberModal}
        title="Add members"
        submitLabel="Done"
        cancelLabel=""
        onSubmit={() => setShowAddMemberModal(false)}
        onCancel={() => setShowAddMemberModal(false)}
        size="md"
      >
        <div className="space-y-4">
          {/* Search input */}
          <Input
            placeholder="Search agents and members..."
            value={memberSearch}
            onChange={(val) => setMemberSearch(val)}
          />

          {/* Search results — agents not yet members */}
          {filteredAgents.length > 0 && (
            <div className="space-y-1">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.agent_id}
                  className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-secondary"
                >
                  <Avatar
                    src={undefined}
                    initials={getInitials(agent.name)}
                    size="sm"
                  />
                  <span className="flex-1 text-sm text-primary">{agent.name}</span>
                  <Button
                    size="sm"
                    color="secondary"
                    onClick={() => handleAddMember(agent.agent_id)}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}

          {filteredAgents.length === 0 && memberSearch && (
            <p className="text-xs text-tertiary text-center py-4">
              No agents found matching &quot;{memberSearch}&quot;
            </p>
          )}

          {/* Divider: Who has access */}
          {roles.length > 0 && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border-secondary" />
                <span className="text-xs text-tertiary">Who has access</span>
                <div className="flex-1 h-px bg-border-secondary" />
              </div>

              {/* Existing members read-only list */}
              <div className="space-y-1">
                {roles.map((role) => {
                  const agent = agents.find((a) => a.agent_id === role.agent_id)
                  const isProjectLead = role.agent_id === localPlAgentId
                  const name = agent?.name ?? 'Unknown'
                  const agentRole = agent?.role ?? ''
                  return (
                    <div
                      key={role.id}
                      className="flex items-center gap-3 py-2 px-2 rounded-md"
                    >
                      <AvatarLabelGroup
                        src={undefined}
                        initials={getInitials(name)}
                        title={name}
                        subtitle={role.title ?? agentRole}
                        size="sm"
                      />
                      <div className="ml-auto shrink-0">
                        {isProjectLead ? (
                          <BadgeWithDot color="brand" type="pill-color">
                            Project Lead
                          </BadgeWithDot>
                        ) : (
                          <BadgeWithDot color="gray" type="pill-color">
                            Member
                          </BadgeWithDot>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </ModalForm>
    </div>
  )
}
