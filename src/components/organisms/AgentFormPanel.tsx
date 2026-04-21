'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Plus, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { ConfirmActionDialog } from '@openclaw/ui'
import { AvatarPickerModal } from '@/components/organisms/AvatarPickerModal'
import { useRealtimeDepartments } from '@/hooks/useRealtimeDepartments'
import type { AgentRow, AgentRole, NodeRow } from '@/types/supabase'

// ---- Types ----

interface AgentFormPanelProps {
  mode: 'create' | 'edit'
  agent?: AgentRow | null
  onClose: () => void
  onSaved?: () => void
}

// ---- Helpers ----

function nodeStatusColor(status: string): string {
  switch (status) {
    case 'online':
      return 'text-success'
    case 'degraded':
      return 'text-warning'
    default:
      return 'text-error-600'
  }
}

function nodeStatusDotColor(status: string): string {
  switch (status) {
    case 'online':
      return 'bg-success'
    case 'degraded':
      return 'bg-warning'
    default:
      return 'bg-error'
  }
}

// ---- Component ----

export function AgentFormPanel({ mode, agent, onClose, onSaved }: AgentFormPanelProps) {
  const { departments } = useRealtimeDepartments()

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Nodes state
  const [nodes, setNodes] = useState<NodeRow[]>([])
  const [nodesLoading, setNodesLoading] = useState(true)

  // Form fields
  const [agentId, setAgentId] = useState(agent?.agent_id ?? '')
  const [name, setName] = useState(agent?.name ?? '')
  const [emoji, setEmoji] = useState(agent?.emoji ?? '')
  const [nodeId, setNodeId] = useState(agent?.node_id ?? '')
  const [departmentId, setDepartmentId] = useState(agent?.department_id ?? '')
  const [role, setRole] = useState<AgentRole>(agent?.role ?? 'specialist')
  const [skills, setSkills] = useState<string[]>(agent?.skills ?? [])
  const [skillInput, setSkillInput] = useState('')
  const [about, setAbout] = useState(agent?.about ?? '')

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Avatar picker
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [avatarType, setAvatarType] = useState<'emoji' | 'photo'>(
    ((agent?.metadata as Record<string, string>)?.avatar_type as 'emoji' | 'photo') ?? 'emoji'
  )
  const [avatarBgColor, setAvatarBgColor] = useState<string>(
    ((agent?.metadata as Record<string, string>)?.avatar_bg_color as string) ?? '#475569'
  )

  // Submission state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState<string | null>(null)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Fetch nodes on mount
  useEffect(() => {
    setNodesLoading(true)
    fetch('/api/nodes/list')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: NodeRow[]) => {
        setNodes(Array.isArray(data) ? data : [])
        // Pre-select first node in create mode if not set
        if (mode === 'create' && !nodeId && data.length > 0) {
          setNodeId(data[0].node_id)
        }
      })
      .catch(() => setNodes([]))
      .finally(() => setNodesLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pre-select first department in create mode
  useEffect(() => {
    if (mode === 'create' && !departmentId && departments.length > 0) {
      setDepartmentId(departments[0].id)
    }
  }, [departments, mode, departmentId])

  // Profile photo URL from metadata
  const existingPhotoUrl = agent
    ? ((agent.metadata as Record<string, string>)?.profile_photo_url ?? null)
    : null

  // Avatar display
  const avatarDisplay = photoPreview ?? existingPhotoUrl
  const avatarFallback = emoji || (name ? name.charAt(0).toUpperCase() : '?')

  // Selected node info for validation indicator
  const selectedNode = nodes.find((n) => n.node_id === nodeId) ?? null

  // ---- Photo upload ----

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setPhotoPreview(url)
    }
  }

  // ---- Skills tag input ----

  const addSkill = useCallback(() => {
    const trimmed = skillInput.trim().replace(/,$/, '')
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed])
    }
    setSkillInput('')
  }, [skillInput, skills])

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill))
  }

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSkill()
    } else if (e.key === 'Backspace' && skillInput === '' && skills.length > 0) {
      setSkills((prev) => prev.slice(0, -1))
    }
  }

  // ---- Validation ----

  const agentIdValid = /^[a-z0-9-]+$/.test(agentId)
  const canSubmit =
    !saving &&
    name.trim().length > 0 &&
    nodeId.trim().length > 0 &&
    role &&
    (mode === 'edit' || (agentId.trim().length > 0 && agentIdValid))

  // ---- Photo upload helper ----

  const uploadPhoto = async (id: string) => {
    if (!photoFile) return
    const formData = new FormData()
    formData.append('photo', photoFile)
    await fetch(`/api/agents/${id}/photo`, {
      method: 'POST',
      body: formData,
    })
  }

  // ---- Submit (create) ----

  const handleCreate = async () => {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        agent_id: agentId.trim(),
        name: name.trim(),
        emoji: emoji.trim() || name.trim().charAt(0).toUpperCase(),
        node_id: nodeId,
        role,
      }
      if (departmentId) body.department_id = departmentId
      if (skills.length > 0) body.skills = skills
      if (about.trim()) body.about = about.trim()
      body.avatar_type = avatarType
      body.avatar_bg_color = avatarBgColor

      const res = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 409) {
        setError('Agent ID already exists. Choose a different ID.')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to create agent.')
        return
      }

      const data = await res.json()
      const createdId = agentId.trim()

      // Upload photo if selected
      await uploadPhoto(createdId)

      // Show API key once
      if (data.api_key) {
        setShowApiKey(data.api_key)
      } else {
        onSaved?.()
        onClose()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ---- Submit (edit) ----

  const handleEdit = async () => {
    if (!agent || !canSubmit) return
    setSaving(true)
    setError(null)
    try {
      // Collect only changed fields
      const changed: Record<string, unknown> = {}
      if (name.trim() !== agent.name) changed.name = name.trim()
      if (emoji.trim() !== agent.emoji) changed.emoji = emoji.trim()
      if (nodeId !== agent.node_id) changed.node_id = nodeId
      if (departmentId !== (agent.department_id ?? '')) {
        changed.department_id = departmentId || null
      }
      if (role !== agent.role) changed.role = role
      const skillsSame =
        JSON.stringify([...skills].sort()) === JSON.stringify([...(agent.skills ?? [])].sort())
      if (!skillsSame) changed.skills = skills
      if (about.trim() !== (agent.about ?? '').trim()) changed.about = about.trim()

      // Avatar metadata
      const currentMeta = (agent.metadata ?? {}) as Record<string, string>
      if (avatarType !== (currentMeta.avatar_type ?? 'emoji') || avatarBgColor !== (currentMeta.avatar_bg_color ?? '#475569')) {
        changed.metadata = { avatar_type: avatarType, avatar_bg_color: avatarBgColor }
      }

      if (Object.keys(changed).length > 0) {
        const res = await fetch(`/api/agents/${agent.agent_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changed),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error ?? 'Failed to update agent.')
          return
        }
      }

      // Upload photo if selected
      await uploadPhoto(agent.agent_id)

      onSaved?.()
      onClose()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ---- Delete ----

  const handleDelete = async () => {
    if (!agent) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/agents/${agent.agent_id}`, {
        method: 'DELETE',
      })

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}))
        const count = data.active_task_count ?? '?'
        setDeleteError(`No se puede eliminar: el agente tiene ${count} tareas activas`)
        return
      }

      if (!res.ok) {
        setDeleteError('Error al eliminar el agente.')
        return
      }

      setShowDeleteConfirm(false)
      onSaved?.()
      onClose()
    } catch {
      setDeleteError('Error de red. Intenta de nuevo.')
    } finally {
      setDeleting(false)
    }
  }

  // ---- API key shown after create ----
  if (showApiKey) {
    return (
      <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-tertiary border-l border-secondary z-50 shadow-[-4px_0_24px_rgba(0,0,0,0.2)] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-secondary flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] font-bold tracking-[0.08em] text-quaternary font-display">
            AGENT CREATED
          </span>
          <button
            onClick={() => {
              onSaved?.()
              onClose()
            }}
            className="w-7 h-7 flex items-center justify-center bg-transparent border-0 cursor-pointer text-quaternary rounded hover:text-primary transition-colors"
            aria-label="Cerrar panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* API Key display */}
        <div className="flex-1 px-4 py-6 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 px-3.5 py-3 bg-success/10 border border-success/30 rounded-lg">
            <CheckCircle size={18} className="text-success flex-shrink-0" />
            <span className="text-sm text-primary font-semibold">
              Agent created successfully
            </span>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-warning mb-1.5">
              API KEY (copy now — shown once)
            </div>
            <div className="px-3.5 py-3 bg-secondary border border-secondary rounded-md text-xs font-mono text-primary break-all leading-relaxed select-all">
              {showApiKey}
            </div>
            <div className="mt-1.5 text-[11px] text-quaternary">
              Store this key safely. It will not be shown again.
            </div>
          </div>

          <button
            onClick={() => {
              onSaved?.()
              onClose()
            }}
            className="mt-auto bg-brand-50 text-white border-0 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer w-full"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  // ---- Main form render ----

  return (
    <>
      <div
        className="fixed right-0 top-0 bottom-0 w-[420px] bg-tertiary border-l border-secondary z-50 shadow-[-4px_0_24px_rgba(0,0,0,0.2)] flex flex-col"
        role="complementary"
        aria-label={mode === 'create' ? 'Crear agente' : 'Editar agente'}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-secondary flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] font-bold tracking-[0.08em] text-quaternary font-display">
            {mode === 'create' ? 'CREATE AGENT' : 'EDIT AGENT'}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center bg-transparent border-0 cursor-pointer text-quaternary rounded hover:text-primary transition-colors"
            aria-label="Cerrar panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

          {/* Avatar section — click opens AvatarPickerModal */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAvatarPicker(true)}
              className="w-16 h-16 rounded-full border-2 border-secondary cursor-pointer flex items-center justify-center overflow-hidden p-0 flex-shrink-0 hover:border-dashed hover:border-accent transition-colors"
              style={{ background: avatarDisplay ? undefined : avatarBgColor, backgroundColor: avatarDisplay ? undefined : undefined }}
              aria-label="Choose avatar"
            >
              {avatarDisplay ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarDisplay}
                  alt="Agent avatar"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-[28px] leading-none">{avatarFallback}</span>
              )}
            </button>
            <span className="text-[10px] text-quaternary">Click to upload profile image</span>
          </div>

          {/* Agent ID (create only) */}
          {mode === 'create' && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-quaternary mb-1.5">Agent ID</div>
              <input
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. nova, ragatha-2"
                className={`w-full bg-secondary border rounded-md px-3 py-2 text-[13px] text-primary outline-none box-border focus:border-accent ${agentId && !agentIdValid ? 'border-error' : 'border-secondary'}`}
              />
              {agentId && !agentIdValid && (
                <div className="mt-1 text-[11px] text-error-600">
                  Only lowercase letters, numbers, and hyphens. No spaces.
                </div>
              )}
            </div>
          )}

          {/* Name */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-quaternary mb-1.5">Name</div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nova"
              className="w-full bg-secondary border border-secondary rounded-md px-3 py-2 text-[13px] text-primary outline-none box-border focus:border-accent"
            />
          </div>

          {/* Workspace / Node */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-quaternary mb-1.5">Workspace (Node)</div>
            {nodesLoading ? (
              <div className="text-xs text-quaternary flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                Loading nodes...
              </div>
            ) : (
              <>
                <select
                  value={nodeId}
                  onChange={(e) => setNodeId(e.target.value)}
                  disabled={mode === 'edit'}
                  className={`w-full bg-secondary border border-secondary rounded-md px-3 py-2 text-[13px] text-primary outline-none box-border appearance-none focus:border-accent ${mode === 'edit' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    paddingRight: '30px',
                  }}
                >
                  <option value="">Select a node...</option>
                  {nodes.map((node) => (
                    <option key={node.node_id} value={node.node_id}>
                      {node.node_id} ({node.status})
                    </option>
                  ))}
                </select>
                {/* Node status indicator */}
                {selectedNode && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${nodeStatusDotColor(selectedNode.status)}`}
                    />
                    {selectedNode.status === 'online' ? (
                      <span className={`${nodeStatusColor('online')} flex items-center gap-1`}>
                        <CheckCircle size={11} />
                        Node is online
                      </span>
                    ) : (
                      <span className={`${nodeStatusColor(selectedNode.status)} flex items-center gap-1`}>
                        <AlertTriangle size={11} />
                        {selectedNode.status === 'degraded'
                          ? 'Node is degraded — agent may have limited functionality'
                          : 'Node is offline — agent will activate when online'}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Department */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-quaternary mb-1.5">Department</div>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full bg-secondary border border-secondary rounded-md px-3 py-2 text-[13px] text-primary outline-none box-border cursor-pointer appearance-none focus:border-accent"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                paddingRight: '30px',
              }}
            >
              <option value="">No department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.icon} {dept.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-quaternary mb-1.5">Role</div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AgentRole)}
              className="w-full bg-secondary border border-secondary rounded-md px-3 py-2 text-[13px] text-primary outline-none box-border cursor-pointer appearance-none focus:border-accent"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                paddingRight: '30px',
              }}
            >
              <option value="lead">Lead (Scrum Master)</option>
              <option value="specialist">Specialist</option>
              <option value="intern">Intern</option>
            </select>
          </div>

          {/* Skills tag input */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-quaternary mb-1.5">Skills</div>
            <div className="bg-secondary border border-secondary rounded-md p-2 flex flex-wrap gap-1 min-h-[42px]">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 text-[11px] font-medium bg-tertiary text-secondary border border-secondary rounded px-1.5 py-0.5"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="bg-transparent border-0 cursor-pointer text-quaternary p-0 flex items-center leading-none hover:text-error-600 transition-colors"
                    aria-label={`Remove skill ${skill}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                onBlur={() => { if (skillInput.trim()) addSkill() }}
                placeholder={skills.length === 0 ? 'Type skill and press Enter' : ''}
                className="bg-transparent border-0 outline-none text-[11px] text-primary min-w-[120px] flex-1"
              />
            </div>
            <div className="mt-1 text-[10px] text-quaternary">
              Press Enter or comma to add a skill
            </div>
          </div>

          {/* About / Soul */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.8px] text-quaternary">About / Soul Description</span>
              {mode === 'edit' && agent?.soul_dirty && (
                <span className="text-[9px] font-bold bg-warning/15 text-warning rounded px-1.5 py-px uppercase tracking-[0.5px] whitespace-nowrap">
                  Needs sync
                </span>
              )}
            </div>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Describe this agent's personality and purpose..."
              rows={5}
              className="w-full bg-secondary border border-secondary rounded-md px-3 py-2 text-[13px] text-primary outline-none box-border resize-vertical leading-relaxed focus:border-accent"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="px-3 py-2.5 bg-error/10 border border-error/30 rounded-md text-xs text-error-600 flex items-center gap-2">
              <AlertTriangle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Spacer for sticky buttons */}
          <div className="h-2" />
        </div>

        {/* Sticky action buttons */}
        <div className="px-4 py-3 border-t border-secondary bg-tertiary flex flex-col gap-2 flex-shrink-0">
          {mode === 'create' ? (
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canSubmit}
              className={`${canSubmit ? 'bg-brand-50 text-white cursor-pointer' : 'bg-secondary text-quaternary cursor-not-allowed'} border-0 rounded-lg px-4 py-2.5 text-[13px] font-semibold w-full flex items-center justify-center gap-1.5`}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={14} />
                  Create Agent
                </>
              )}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleEdit}
                disabled={!canSubmit}
                className={`${canSubmit ? 'bg-brand-50 text-white cursor-pointer' : 'bg-secondary text-quaternary cursor-not-allowed'} border-0 rounded-lg px-4 py-2.5 text-[13px] font-semibold w-full flex items-center justify-center gap-1.5`}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="bg-transparent text-error-600 border-0 rounded-lg px-4 py-1.5 text-xs font-semibold cursor-pointer w-full hover:bg-error/10 transition-colors"
              >
                Delete Agent
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {mode === 'edit' && agent && (
        <ConfirmActionDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title={`Eliminar ${agent.name}?`}
          description="Esta accion no se puede deshacer."
          onConfirm={handleDelete}
          isConfirming={deleting}
          errorMessage={deleteError}
          confirmLabel="Eliminar"
          confirmingLabel="Eliminando..."
          cancelLabel="Cancelar"
        />
      )}

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        open={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        agentName={name}
        currentEmoji={emoji}
        currentPhotoPreview={photoPreview ?? existingPhotoUrl}
        currentAvatarType={avatarType}
        currentBgColor={avatarBgColor}
        onConfirm={(result) => {
          setEmoji(result.emoji)
          setAvatarType(result.avatarType)
          setAvatarBgColor(result.bgColor)
          if (result.photoFile) {
            setPhotoFile(result.photoFile)
            setPhotoPreview(result.photoPreview)
          } else if (result.avatarType === 'emoji') {
            // Switching to emoji clears photo preview (but doesn't delete from storage)
            setPhotoPreview(null)
          }
          setShowAvatarPicker(false)
        }}
      />
    </>
  )
}
