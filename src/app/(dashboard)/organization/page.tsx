'use client'

import { useState, type ComponentType } from 'react'
import { Building2, Plus, Edit2, Trash2, Users, X, Check, Search, LayoutGrid, Shield, Briefcase, Zap, Target, Bot, type LucideProps } from 'lucide-react'
import { useRealtimeDepartments } from '@/hooks/useRealtimeDepartments'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import type { DepartmentRow } from '@/types/supabase'
import { Badge } from '@openclaw/ui'

// Map icon name strings from DB to actual lucide-react components
const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  search: Search,
  kanban: LayoutGrid,
  shield: Shield,
  briefcase: Briefcase,
  zap: Zap,
  target: Target,
  building: Building2,
}

function DeptIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const IconComponent = ICON_MAP[name]
  if (IconComponent) return <IconComponent className={className} style={style} />
  if (/\p{Emoji}/u.test(name)) return <span className={className} style={style}>{name}</span>
  return <Building2 className={className} style={style} />
}

interface DepartmentFormData {
  display_name: string
  objective: string
  color: string
  icon: string
  sort_order: number
}

const DEFAULT_FORM: DepartmentFormData = {
  display_name: '',
  objective: '',
  color: '#6366f1',
  icon: '🏢',
  sort_order: 0,
}

interface DepartmentWithCount extends DepartmentRow {
  agents?: Array<{ count: number }>
}

export default function OrganizationPage() {
  const { departments: rawDepartments, loading, error } = useRealtimeDepartments()
  const departments = rawDepartments as DepartmentWithCount[]
  const { agents } = useRealtimeAgents()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<DepartmentFormData>(DEFAULT_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Count agents per department from realtime agents data
  const agentCountMap: Record<string, number> = {}
  agents.forEach((agent) => {
    const deptId = (agent as unknown as { department_id?: string | null }).department_id ?? null
    if (deptId) {
      agentCountMap[deptId] = (agentCountMap[deptId] || 0) + 1
    }
  })

  const totalAgents = agents.length
  const getAgentCount = (dept: DepartmentWithCount): number => agentCountMap[dept.id] || 0

  const openCreateForm = () => {
    setFormData(DEFAULT_FORM)
    setFormError(null)
    setEditingId(null)
    setShowCreateForm(true)
  }

  const openEditForm = (dept: DepartmentWithCount) => {
    setFormData({
      display_name: dept.display_name,
      objective: dept.objective ?? '',
      color: dept.color,
      icon: dept.icon,
      sort_order: dept.sort_order,
    })
    setFormError(null)
    setEditingId(dept.id)
    setShowCreateForm(false)
  }

  const closeForm = () => {
    setShowCreateForm(false)
    setEditingId(null)
    setFormError(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error || 'Failed to create department')
        return
      }
      closeForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create department')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/departments/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error || 'Failed to update department')
        return
      }
      closeForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update department')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (dept: DepartmentWithCount) => {
    const agentCount = getAgentCount(dept)
    if (agentCount > 0) {
      alert('Cannot delete department with assigned agents. Reassign or remove agents first.')
      return
    }
    if (!window.confirm(`Delete department "${dept.display_name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/departments/${dept.id}`, { method: 'DELETE' })
      if (res.status === 409) {
        alert('Cannot delete department with assigned agents.')
        return
      }
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to delete department')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete department')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-lg text-[var(--text-quaternary-500)]">
          Loading organization...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div style={{ color: '#ef4444' }}>Error: {error}</div>
      </div>
    )
  }

  const DepartmentForm = ({ onSubmit, isEdit }: { onSubmit: (e: React.FormEvent) => void; isEdit: boolean }) => (
    <div className="rounded-2xl p-5 mb-6 bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-[var(--text-primary-900)]" style={{ fontSize: '15px' }}>
          {isEdit ? 'Edit Department' : 'New Department'}
        </h2>
        <button
          onClick={closeForm}
          className="text-[var(--text-quaternary-500)] bg-transparent border-none cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-quaternary-500)]">
              Display Name *
            </label>
            <input
              type="text"
              required
              value={formData.display_name}
              onChange={(e) => setFormData((f) => ({ ...f, display_name: e.target.value }))}
              placeholder="e.g. Sales Prospecting"
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-primary-900)] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-quaternary-500)]">
              Icon (emoji)
            </label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData((f) => ({ ...f, icon: e.target.value }))}
              placeholder="🏢"
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-primary-900)] outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-quaternary-500)]">
            Objective
          </label>
          <textarea
            value={formData.objective}
            onChange={(e) => setFormData((f) => ({ ...f, objective: e.target.value }))}
            placeholder="Describe what this department does..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-primary-900)] outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-quaternary-500)]">
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData((f) => ({ ...f, color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer border border-[var(--border-primary)]"
              />
              <span className="text-sm font-mono text-[var(--text-secondary-700)]">
                {formData.color}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-quaternary-500)]">
              Sort Order
            </label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-primary-900)] outline-none"
            />
          </div>
        </div>
        {formError && (
          <div className="text-sm px-3 py-2 rounded-lg bg-[var(--error-600)]/10 text-[var(--error-600)]">
            {formError}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--brand-600)] text-[var(--text-primary-900)] border-none cursor-pointer disabled:opacity-60"
          >
            <Check className="w-4 h-4" />
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Department'}
          </button>
          <button
            type="button"
            onClick={closeForm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-secondary-700)] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )

  return (
    <div className="-m-6">
      {/* Sticky header — matches openclaw-mission-control template style */}
      <div className="sticky top-0 z-30 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="px-4 pt-2 pb-4 md:px-8 md:pt-3 md:pb-5">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary-900)] font-[family-name:var(--font-display)]">
                  Organization
                </h1>
                <Badge variant="gray" className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  The Digital Circus
                </Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--text-quaternary-500)]">
                Manage departments and agent assignments across your workspace.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--text-quaternary-500)]">
                <span>
                  <strong className="text-[var(--text-primary-900)]">{departments.length}</strong> departments
                </span>
                <span>
                  <strong className="text-[var(--text-primary-900)]">{totalAgents}</strong> agents
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!showCreateForm && editingId === null && (
                <button
                  onClick={openCreateForm}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--brand-600)] text-[var(--text-primary-900)] border-none cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Department
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="px-4 py-4 md:px-8 md:py-8">
        {/* Create form */}
        {showCreateForm && <DepartmentForm onSubmit={handleCreate} isEdit={false} />}

        {/* Empty state */}
        {departments.length === 0 && !showCreateForm && (
          <div className="rounded-2xl p-12 text-center bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-[var(--text-quaternary-500)]" />
            <p className="text-lg font-medium mb-2 text-[var(--text-primary-900)]">No departments yet</p>
            <p className="text-sm mb-4 text-[var(--text-quaternary-500)]">Create your first department to organize agents</p>
            <button
              onClick={openCreateForm}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium mx-auto bg-[var(--brand-600)] text-[var(--text-primary-900)] border-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Department
            </button>
          </div>
        )}

        {/* Departments table — openclaw-mission-control style rounded card */}
        {departments.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            {/* Table header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-primary)]">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary-900)]">
                  Departments
                </h2>
                <p className="text-xs text-[var(--text-quaternary-500)]">
                  Organizational structure and agent allocation.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-quaternary-500)]">
                <Users className="h-4 w-4" />
                {departments.length} total
              </div>
            </div>

            {/* Table rows */}
            <div>
              {departments.map((dept, idx) => {
                const agentCount = getAgentCount(dept)
                const isEditing = editingId === dept.id
                const isLast = idx === departments.length - 1

                if (isEditing) {
                  return (
                    <div
                      key={dept.id}
                      className="px-5 py-4"
                      style={!isLast ? { borderBottom: '1px solid var(--border-primary)' } : undefined}
                    >
                      <DepartmentForm onSubmit={handleEdit} isEdit={true} />
                    </div>
                  )
                }

                return (
                  <div
                    key={dept.id}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--bg-secondary)]"
                    style={{
                      borderBottom: !isLast ? '1px solid var(--border-primary)' : undefined,
                      borderLeft: `3px solid ${dept.color}`,
                    }}
                  >
                    {/* Icon + name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${dept.color}20` }}
                      >
                        <DeptIcon name={dept.icon} className="w-5 h-5" style={{ color: dept.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate text-[var(--text-primary-900)]">
                          {dept.display_name}
                        </p>
                        <p className="text-xs truncate text-[var(--text-quaternary-500)]">
                          {dept.objective || 'No objective defined'}
                        </p>
                      </div>
                    </div>

                    {/* Agent count badge */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-[var(--text-quaternary-500)]" />
                      <span className="text-xs font-medium text-[var(--text-secondary-700)]">
                        {agentCount} agent{agentCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditForm(dept)}
                        className="p-1.5 rounded-lg transition-colors text-[var(--text-quaternary-500)] bg-transparent border-none cursor-pointer hover:text-[var(--text-primary-900)] hover:bg-[var(--bg-primary)]"
                        title="Edit department"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dept)}
                        disabled={agentCount > 0}
                        className="p-1.5 rounded-lg transition-colors bg-transparent border-none hover:bg-[var(--error-600)]/10 disabled:cursor-not-allowed disabled:opacity-40"
                        style={{
                          color: agentCount > 0 ? 'var(--text-quaternary-500)' : 'var(--error-600)',
                          cursor: agentCount > 0 ? 'not-allowed' : 'pointer',
                        }}
                        title={agentCount > 0 ? 'Cannot delete: has assigned agents' : 'Delete department'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
