'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Plus, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog'
import { useRealtimeDepartments } from '@/hooks/useRealtimeDepartments'
import type { AgentRow, AgentRole, NodeRow } from '@/types/supabase'

// ---- Types ----

interface AgentFormPanelProps {
  mode: 'create' | 'edit'
  agent?: AgentRow | null
  onClose: () => void
  onSaved?: () => void
}

// ---- Style constants ----

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  color: 'var(--text-muted)',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '8px 12px',
  fontSize: '13px',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-body)',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: '30px',
}

// ---- Helpers ----

function nodeStatusColor(status: string): string {
  switch (status) {
    case 'online':
      return '#32D74B'
    case 'degraded':
      return '#FFD60A'
    default:
      return '#FF453A'
  }
}

// ---- Component ----

export function AgentFormPanel({ mode, agent, onClose, onSaved }: AgentFormPanelProps) {
  const { departments } = useRealtimeDepartments()

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
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: '420px',
          background: 'var(--surface-elevated, #242424)',
          borderLeft: '1px solid var(--border)',
          zIndex: 50,
          boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
            }}
          >
            AGENT CREATED
          </span>
          <button
            onClick={() => {
              onSaved?.()
              onClose()
            }}
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              borderRadius: '4px',
            }}
            aria-label="Cerrar panel"
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={16} />
          </button>
        </div>

        {/* API Key display */}
        <div style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              background: 'rgba(50,215,75,0.08)',
              border: '1px solid rgba(50,215,75,0.3)',
              borderRadius: '8px',
            }}
          >
            <CheckCircle size={18} style={{ color: '#32D74B', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
              Agent created successfully
            </span>
          </div>

          <div>
            <div style={{ ...sectionLabelStyle, color: 'var(--warning, #FFD60A)' }}>
              API KEY (copy now — shown once)
            </div>
            <div
              style={{
                padding: '12px 14px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: 'var(--text-primary)',
                wordBreak: 'break-all',
                lineHeight: 1.6,
                userSelect: 'all',
              }}
            >
              {showApiKey}
            </div>
            <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              Store this key safely. It will not be shown again.
            </div>
          </div>

          <button
            onClick={() => {
              onSaved?.()
              onClose()
            }}
            style={{
              marginTop: 'auto',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  // ---- Main form render ----

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    right: 0,
    top: 0,
    bottom: 0,
    width: '420px',
    background: 'var(--surface-elevated, #242424)',
    borderLeft: '1px solid var(--border)',
    zIndex: 50,
    boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <>
      <div style={panelStyle} role="complementary" aria-label={mode === 'create' ? 'Crear agente' : 'Editar agente'}>
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
            }}
          >
            {mode === 'create' ? 'CREATE AGENT' : 'EDIT AGENT'}
          </span>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              borderRadius: '4px',
            }}
            aria-label="Cerrar panel"
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable form body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Photo section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePhotoClick}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--surface)',
                border: '2px dashed var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: 0,
                flexShrink: 0,
              }}
              aria-label="Upload profile photo"
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {avatarDisplay ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarDisplay}
                  alt="Agent avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                <span style={{ fontSize: '28px', lineHeight: 1 }}>{avatarFallback}</span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Click to upload photo</span>
          </div>

          {/* Agent ID (create only) */}
          {mode === 'create' && (
            <div>
              <div style={sectionLabelStyle}>Agent ID</div>
              <input
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. nova, ragatha-2"
                style={{
                  ...inputStyle,
                  borderColor: agentId && !agentIdValid ? 'var(--negative)' : 'var(--border)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = agentId && !agentIdValid ? 'var(--negative)' : 'var(--border)')}
              />
              {agentId && !agentIdValid && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--negative)' }}>
                  Only lowercase letters, numbers, and hyphens. No spaces.
                </div>
              )}
            </div>
          )}

          {/* Name */}
          <div>
            <div style={sectionLabelStyle}>Name</div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nova"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Emoji */}
          <div>
            <div style={sectionLabelStyle}>Emoji</div>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder={name ? name.charAt(0).toUpperCase() : '🤖'}
              style={{ ...inputStyle, width: '72px' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              maxLength={4}
            />
          </div>

          {/* Workspace / Node */}
          <div>
            <div style={sectionLabelStyle}>Workspace (Node)</div>
            {nodesLoading ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                Loading nodes...
              </div>
            ) : (
              <>
                <select
                  value={nodeId}
                  onChange={(e) => setNodeId(e.target.value)}
                  style={selectStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
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
                  <div
                    style={{
                      marginTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: nodeStatusColor(selectedNode.status),
                        flexShrink: 0,
                      }}
                    />
                    {selectedNode.status === 'online' ? (
                      <span style={{ color: '#32D74B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={11} />
                        Node is online
                      </span>
                    ) : (
                      <span style={{ color: 'var(--warning, #FFD60A)', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
            <div style={sectionLabelStyle}>Department</div>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              style={selectStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
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
            <div style={sectionLabelStyle}>Role</div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AgentRole)}
              style={selectStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <option value="lead">Lead (Scrum Master)</option>
              <option value="specialist">Specialist</option>
              <option value="intern">Intern</option>
            </select>
          </div>

          {/* Skills tag input */}
          <div>
            <div style={sectionLabelStyle}>Skills</div>
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                minHeight: '42px',
              }}
            >
              {skills.map((skill) => (
                <span
                  key={skill}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 500,
                    background: 'var(--surface-elevated, #2a2a2a)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                  }}
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      lineHeight: 1,
                    }}
                    aria-label={`Remove skill ${skill}`}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--negative)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
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
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  minWidth: '120px',
                  flex: 1,
                }}
              />
            </div>
            <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
              Press Enter or comma to add a skill
            </div>
          </div>

          {/* About / Soul */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={sectionLabelStyle}>About / Soul Description</span>
              {mode === 'edit' && agent?.soul_dirty && (
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    background: 'rgba(255,214,10,0.15)',
                    color: 'var(--warning, #FFD60A)',
                    borderRadius: '4px',
                    padding: '1px 6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Needs sync
                </span>
              )}
            </div>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Describe this agent's personality and purpose..."
              rows={5}
              style={{
                ...inputStyle,
                resize: 'vertical',
                lineHeight: 1.5,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Error message */}
          {error && (
            <div
              style={{
                padding: '10px 12px',
                background: 'rgba(255,69,58,0.1)',
                border: '1px solid rgba(255,69,58,0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--negative, #FF453A)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Spacer for sticky buttons */}
          <div style={{ height: '8px' }} />
        </div>

        {/* Sticky action buttons */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface-elevated, #242424)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          {mode === 'create' ? (
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canSubmit}
              style={{
                background: canSubmit ? 'var(--accent)' : 'var(--surface)',
                color: canSubmit ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontFamily: 'var(--font-body)',
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
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
                style={{
                  background: canSubmit ? 'var(--accent)' : 'var(--surface)',
                  color: canSubmit ? 'white' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
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
                style={{
                  background: 'transparent',
                  color: 'var(--negative, #FF453A)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,69,58,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
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
    </>
  )
}
