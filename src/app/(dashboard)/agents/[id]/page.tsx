'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Tag,
  Briefcase,
  User,
  Clock,
  Shield,
  Building2,
  Circle,
} from 'lucide-react'
import type { AgentRow, AgentBadge, AgentRole, AgentStatus, DepartmentRow, TaskRow } from '@/types/supabase'

// API response extends AgentRow with joined data
interface AgentProfile extends AgentRow {
  departments?: {
    display_name: string
    color: string
    icon: string
    objective: string | null
  } | null
  recent_tasks?: TaskRow[]
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: '#4ade80',
  working: '#f59e0b',
  error: '#ef4444',
  offline: '#6b7280',
  thinking: '#3b82f6',
  queued: '#eab308',
}

const BADGE_STYLES: Record<AgentBadge, { bg: string; color: string }> = {
  LEAD: { bg: '#f59e0b20', color: '#f59e0b' },
  SPC: { bg: '#3b82f620', color: '#3b82f6' },
  INT: { bg: '#22c55e20', color: '#22c55e' },
}

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: '#eab308',
  claimed: '#3b82f6',
  in_progress: '#8b5cf6',
  completed: '#22c55e',
  failed: '#ef4444',
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  if (diff < 0) return 'just now'
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function roleToBadge(role: AgentRole): AgentBadge {
  if (role === 'lead') return 'LEAD'
  if (role === 'specialist') return 'SPC'
  return 'INT'
}

interface EditFormState {
  about: string
  skills: string[]
  department_id: string
  role: AgentRole
  badge: AgentBadge
  soul_config: string
}

export default function AgentProfilePage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string

  const [agent, setAgent] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Edit form state
  const [editForm, setEditForm] = useState<EditFormState>({
    about: '',
    skills: [],
    department_id: '',
    role: 'intern',
    badge: 'INT',
    soul_config: '{}',
  })
  const [newSkill, setNewSkill] = useState('')

  // Departments for the select
  const [departments, setDepartments] = useState<DepartmentRow[]>([])

  const fetchAgent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agentId}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to load agent')
        return
      }
      const data: AgentProfile = await res.json()
      setAgent(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent')
    } finally {
      setLoading(false)
    }
  }, [agentId])

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments')
      if (res.ok) {
        const data = await res.json()
        setDepartments(data)
      }
    } catch {
      // Non-critical
    }
  }, [])

  useEffect(() => {
    fetchAgent()
    fetchDepartments()
  }, [fetchAgent, fetchDepartments])

  const enterEditMode = () => {
    if (!agent) return
    setEditForm({
      about: agent.about ?? '',
      skills: agent.skills ? [...agent.skills] : [],
      department_id: agent.department_id ?? '',
      role: agent.role ?? 'intern',
      badge: agent.badge ?? 'INT',
      soul_config: agent.soul_config
        ? JSON.stringify(agent.soul_config, null, 2)
        : '{}',
    })
    setSaveError(null)
    setEditMode(true)
  }

  const cancelEdit = () => {
    setEditMode(false)
    setSaveError(null)
  }

  const addSkill = () => {
    const skill = newSkill.trim()
    if (!skill || editForm.skills.includes(skill)) return
    setEditForm((f) => ({ ...f, skills: [...f.skills, skill] }))
    setNewSkill('')
  }

  const removeSkill = (skill: string) => {
    setEditForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }))
  }

  const handleRoleChange = (role: AgentRole) => {
    setEditForm((f) => ({ ...f, role, badge: roleToBadge(role) }))
  }

  const handleSave = async () => {
    if (!agent) return
    setSaving(true)
    setSaveError(null)

    // Validate soul_config JSON
    let parsedSoulConfig: Record<string, unknown> | null = null
    try {
      parsedSoulConfig = JSON.parse(editForm.soul_config)
    } catch {
      setSaveError('soul_config must be valid JSON')
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          about: editForm.about || null,
          skills: editForm.skills,
          department_id: editForm.department_id || null,
          role: editForm.role,
          badge: editForm.badge,
          soul_config: parsedSoulConfig,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setSaveError(data.error || 'Failed to save')
        return
      }
      // Refresh agent data
      await fetchAgent()
      setEditMode(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-lg" style={{ color: 'var(--text-muted)' }}>
            Loading agent profile...
          </div>
        </div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.push('/agents')}
          className="flex items-center gap-2 mb-6 text-sm"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Agents
        </button>
        <div style={{ color: '#ef4444' }}>{error || 'Agent not found'}</div>
      </div>
    )
  }

  const statusColor = STATUS_COLORS[agent.status] || '#6b7280'
  const badgeStyle = agent.badge ? BADGE_STYLES[agent.badge] : null
  const deptColor = agent.departments?.color ?? '#6366f1'

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Back + Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/agents')}
          className="flex items-center gap-2 mb-4 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Agents
        </button>

        {/* Agent header card */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            background: `linear-gradient(135deg, ${deptColor}12, var(--card))`,
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{
                  backgroundColor: `${deptColor}25`,
                  border: `2px solid ${deptColor}`,
                }}
              >
                {agent.emoji}
              </div>

              {/* Info */}
              <div>
                <h1
                  className="text-2xl font-bold mb-1"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--text-primary)',
                    letterSpacing: '-1px',
                  }}
                >
                  {agent.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status */}
                  <div className="flex items-center gap-1">
                    <Circle className="w-2 h-2" style={{ fill: statusColor, color: statusColor }} />
                    <span className="text-xs font-medium capitalize" style={{ color: statusColor }}>
                      {agent.status}
                    </span>
                  </div>

                  {/* Badge */}
                  {agent.badge && badgeStyle && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.color }}
                    >
                      {agent.badge}
                    </span>
                  )}

                  {/* Department */}
                  {agent.departments && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${deptColor}20`,
                        color: deptColor,
                        border: `1px solid ${deptColor}40`,
                      }}
                    >
                      {agent.departments.icon} {agent.departments.display_name}
                    </span>
                  )}

                  {/* Role */}
                  {agent.role && (
                    <span className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                      {agent.role}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Edit button */}
            {!editMode && (
              <button
                onClick={enterEditMode}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            )}
            {editMode && (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--accent)',
                    border: 'none',
                    color: '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {saveError && (
            <div
              className="mt-3 text-sm px-3 py-2 rounded-lg"
              style={{ backgroundColor: '#ef444420', color: '#ef4444' }}
            >
              {saveError}
            </div>
          )}
        </div>
      </div>

      {/* Content sections */}
      <div className="space-y-4">
        {/* About */}
        <Section title="About" icon={<User className="w-4 h-4" />}>
          {editMode ? (
            <textarea
              value={editForm.about}
              onChange={(e) => setEditForm((f) => ({ ...f, about: e.target.value }))}
              placeholder="Describe this agent's purpose and personality..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          ) : (
            <p className="text-sm" style={{ color: agent.about ? 'var(--text-secondary)' : 'var(--text-muted)', fontStyle: agent.about ? 'normal' : 'italic' }}>
              {agent.about ?? 'No about information.'}
            </p>
          )}
        </Section>

        {/* Skills */}
        <Section title="Skills" icon={<Tag className="w-4 h-4" />}>
          {editMode ? (
            <div className="space-y-3">
              {/* Existing skills */}
              <div className="flex flex-wrap gap-2">
                {editForm.skills.map((skill) => (
                  <span
                    key={skill}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: `${deptColor}15`,
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: 0 }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              {/* Add skill input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                  placeholder="Add a skill..."
                  className="flex-1 px-3 py-1.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <>
              {agent.skills && agent.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {agent.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-3 py-1 rounded-full"
                      style={{
                        backgroundColor: `${deptColor}15`,
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No skills defined.</p>
              )}
            </>
          )}
        </Section>

        {/* Department + Role */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Department */}
          <Section title="Department" icon={<Building2 className="w-4 h-4" />}>
            {editMode ? (
              <select
                value={editForm.department_id}
                onChange={(e) => setEditForm((f) => ({ ...f, department_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              >
                <option value="">No department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.icon} {dept.display_name}
                  </option>
                ))}
              </select>
            ) : (
              <>
                {agent.departments ? (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-sm font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${deptColor}20`,
                          color: deptColor,
                          border: `1px solid ${deptColor}40`,
                        }}
                      >
                        {agent.departments.icon} {agent.departments.display_name}
                      </span>
                    </div>
                    {agent.departments.objective && (
                      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                        {agent.departments.objective}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>Not assigned to a department.</p>
                )}
              </>
            )}
          </Section>

          {/* Role */}
          <Section title="Role & Badge" icon={<Shield className="w-4 h-4" />}>
            {editMode ? (
              <select
                value={editForm.role}
                onChange={(e) => handleRoleChange(e.target.value as AgentRole)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              >
                <option value="lead">Lead</option>
                <option value="specialist">Specialist</option>
                <option value="intern">Intern</option>
              </select>
            ) : (
              <div className="flex items-center gap-3">
                {agent.role && (
                  <span className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>
                    {agent.role}
                  </span>
                )}
                {agent.badge && badgeStyle && (
                  <span
                    className="text-sm font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.color }}
                  >
                    {agent.badge}
                  </span>
                )}
                {!agent.role && !agent.badge && (
                  <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No role assigned.</p>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* Current Task */}
        <Section title="Current Task" icon={<Briefcase className="w-4 h-4" />}>
          {agent.current_task_id ? (
            <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              {agent.current_task_id}
            </p>
          ) : (
            <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No active task.</p>
          )}
        </Section>

        {/* Soul Config — only in edit mode */}
        {editMode && (
          <Section title="Soul Config (JSON)" icon={<User className="w-4 h-4" />}>
            <textarea
              value={editForm.soul_config}
              onChange={(e) => setEditForm((f) => ({ ...f, soul_config: e.target.value }))}
              rows={8}
              className="w-full px-3 py-2 rounded-lg text-sm font-mono resize-vertical"
              spellCheck={false}
              style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Changing soul_config will set soul_dirty = true in the database, triggering soul-sync.
            </p>
          </Section>
        )}

        {/* Task History */}
        <Section title="Task History" icon={<Clock className="w-4 h-4" />}>
          {agent.recent_tasks && agent.recent_tasks.length > 0 ? (
            <div className="space-y-0 divide-y" style={{ borderColor: 'var(--border)' }}>
              {agent.recent_tasks.map((task) => (
                <div key={task.task_id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: TASK_STATUS_COLORS[task.status] || '#6b7280' }}
                  />
                  <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                    {task.title}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{
                      backgroundColor: `${TASK_STATUS_COLORS[task.status] || '#6b7280'}20`,
                      color: TASK_STATUS_COLORS[task.status] || '#6b7280',
                    }}
                  >
                    {task.status}
                  </span>
                  {task.type && (
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {task.type}
                    </span>
                  )}
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {formatRelativeTime(task.updated_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No task history.</p>
          )}
        </Section>
      </div>
    </div>
  )
}

// Helper section card component
function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
        <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}
