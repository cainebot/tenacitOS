'use client'

import { useState, useEffect, type ComponentType } from 'react'
import { Building2, Plus, Edit2, Trash2, Users, X, Check, Search, LayoutGrid, Shield, Briefcase, Zap, Target, type LucideProps } from 'lucide-react'
import { useRealtimeDepartments } from '@/hooks/useRealtimeDepartments'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import type { DepartmentRow } from '@/types/supabase'

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
  // Fallback: if it looks like an emoji, render as text; otherwise use Building2
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

// Extend DepartmentRow to allow agent count from API response
interface DepartmentWithCount extends DepartmentRow {
  agents?: Array<{ count: number }>
}

export default function DepartmentsPage() {
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

  const getAgentCount = (dept: DepartmentWithCount): number => {
    return agentCountMap[dept.id] || 0
  }

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
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-lg" style={{ color: 'var(--text-muted)' }}>
            Loading departments...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div style={{ color: '#ef4444' }}>Error: {error}</div>
        </div>
      </div>
    )
  }

  const DepartmentForm = ({ onSubmit, isEdit }: { onSubmit: (e: React.FormEvent) => void; isEdit: boolean }) => (
    <div
      className="rounded-xl p-5 mb-6"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
          {isEdit ? 'Edit Department' : 'New Department'}
        </h2>
        <button
          onClick={closeForm}
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Display Name *
            </label>
            <input
              type="text"
              required
              value={formData.display_name}
              onChange={(e) => setFormData((f) => ({ ...f, display_name: e.target.value }))}
              placeholder="e.g. Sales Prospecting"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Icon (emoji)
            </label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData((f) => ({ ...f, icon: e.target.value }))}
              placeholder="🏢"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            Objective
          </label>
          <textarea
            value={formData.objective}
            onChange={(e) => setFormData((f) => ({ ...f, objective: e.target.value }))}
            placeholder="Describe what this department does..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none"
            style={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData((f) => ({ ...f, color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer"
                style={{ border: '1px solid var(--border)' }}
              />
              <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                {formData.color}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Sort Order
            </label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>
        {formError && (
          <div className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
            {formError}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            <Check className="w-4 h-4" />
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Department'}
          </button>
          <button
            type="button"
            onClick={closeForm}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--text-primary)',
              letterSpacing: '-1.5px',
            }}
          >
            <Building2 className="inline-block w-8 h-8 mr-2 mb-1" />
            Departments
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Organizational structure • {departments.length} department{departments.length !== 1 ? 's' : ''}
          </p>
        </div>
        {!showCreateForm && editingId === null && (
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <Plus className="w-4 h-4" />
            New Department
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && <DepartmentForm onSubmit={handleCreate} isEdit={false} />}

      {/* Empty state */}
      {departments.length === 0 && !showCreateForm && (
        <div
          className="rounded-xl p-12 text-center"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <Building2 className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No departments yet</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Create your first department to organize agents</p>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium mx-auto"
            style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <Plus className="w-4 h-4" />
            Create Department
          </button>
        </div>
      )}

      {/* Departments grid */}
      {departments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => {
            const agentCount = getAgentCount(dept)
            const isEditing = editingId === dept.id

            return (
              <div key={dept.id}>
                {isEditing ? (
                  <DepartmentForm onSubmit={handleEdit} isEdit={true} />
                ) : (
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderLeft: `4px solid ${dept.color}`,
                    }}
                  >
                    {/* Card header */}
                    <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <DeptIcon name={dept.icon} className="w-6 h-6" style={{ color: dept.color }} />
                          <div>
                            <h3
                              className="font-semibold"
                              style={{ color: 'var(--text-primary)', fontSize: '15px' }}
                            >
                              {dept.display_name}
                            </h3>
                            <div className="flex items-center gap-1 mt-1">
                              <Users className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                              <span
                                className="text-xs"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {agentCount} agent{agentCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                          style={{ backgroundColor: dept.color }}
                          title={dept.color}
                        />
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                      {dept.objective ? (
                        <p
                          className="text-sm"
                          style={{
                            color: 'var(--text-secondary)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {dept.objective}
                        </p>
                      ) : (
                        <p className="text-sm" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No objective defined
                        </p>
                      )}
                    </div>

                    {/* Card footer */}
                    <div className="px-5 py-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditForm(dept)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: 'var(--bg)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                        title="Edit department"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(dept)}
                        disabled={agentCount > 0}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: agentCount > 0 ? 'var(--bg)' : '#ef444415',
                          border: `1px solid ${agentCount > 0 ? 'var(--border)' : '#ef444440'}`,
                          color: agentCount > 0 ? 'var(--text-muted)' : '#ef4444',
                          cursor: agentCount > 0 ? 'not-allowed' : 'pointer',
                          opacity: agentCount > 0 ? 0.5 : 1,
                        }}
                        title={agentCount > 0 ? 'Cannot delete: has assigned agents' : 'Delete department'}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
