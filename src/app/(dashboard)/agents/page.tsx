'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Button, BadgeWithDot, FeaturedIcon } from '@circos/ui'
import { Plus, Users01 } from '@untitledui/icons'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import { useDebounce } from '@/hooks/useDebounce'
import { AgentCard } from '@/components/application/agent-card'
import { AgentTable } from '@/components/application/agent-table'
import { AgentFilterBar } from '@/components/application/agent-filter-bar'
import type { SelectItemType } from '@/components/application/agent-filter-bar'

export default function AgentsPage() {
  const { agents, loading, error } = useRealtimeAgents()

  // View mode — SSR-safe: default 'grid', read localStorage on mount
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  useEffect(() => {
    const stored = localStorage.getItem('agents-view-preference')
    if (stored === 'grid' || stored === 'list') setViewMode(stored)
  }, [])

  const handleToggleView = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('agents-view-preference', mode)
  }

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [nodeFilter, setNodeFilter] = useState<string>('all')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const debouncedSearch = useDebounce(searchQuery, 200)

  // Derived: is any filter active?
  const isFiltered = searchQuery !== '' || statusFilter !== 'all' || nodeFilter !== 'all' || deptFilter !== 'all'

  const handleClearAll = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setNodeFilter('all')
    setDeptFilter('all')
  }

  // Derived: filter options from live data
  const statusOptions: SelectItemType[] = useMemo(() => [
    { id: 'all', label: 'All statuses' },
    ...Array.from(new Set(agents.map(a => a.status))).map(s => ({ id: s, label: s }))
  ], [agents])

  const nodeOptions: SelectItemType[] = useMemo(() => [
    { id: 'all', label: 'All nodes' },
    ...Array.from(new Set(agents.map(a => a.node_id))).map(n => ({ id: n, label: n }))
  ], [agents])

  const deptOptions: SelectItemType[] = useMemo(() => [
    { id: 'all', label: 'All departments' },
    ...Array.from(new Set(
      agents.map(a => a.departments?.display_name).filter(Boolean) as string[]
    )).map(d => ({ id: d, label: d }))
  ], [agents])

  // Derived: filtered agents
  const filteredAgents = useMemo(() => {
    return agents.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (nodeFilter !== 'all' && a.node_id !== nodeFilter) return false
      if (deptFilter !== 'all' && a.departments?.display_name !== deptFilter) return false
      if (debouncedSearch && !a.name.toLowerCase().includes(debouncedSearch.toLowerCase())) return false
      return true
    })
  }, [agents, statusFilter, nodeFilter, deptFilter, debouncedSearch])

  // ── Loading state ──
  if (loading) {
    return (
      <main className="flex flex-1 flex-col gap-8 px-8 py-8" aria-label="Loading agents...">
        {/* Page header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 animate-pulse rounded-md bg-secondary" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-secondary" />
        </div>
        {/* Filter bar skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-64 animate-pulse rounded-md bg-secondary" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-secondary" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-secondary" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-secondary" />
        </div>
        {/* Grid skeleton — 6 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-secondary animate-pulse h-[180px]" />
          ))}
        </div>
      </main>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-8">
        <FeaturedIcon icon={<Users01 />} color="error" variant="light" size="lg" />
        <div className="text-center">
          <h2 className="text-[16px] font-[600] text-primary">Failed to load agents</h2>
          <p className="mt-1 text-[14px] text-tertiary">
            Could not connect to the database. Check your Supabase connection and refresh the page.
          </p>
        </div>
      </main>
    )
  }

  // ── Empty state (zero agents in DB) ──
  if (agents.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-8">
        <FeaturedIcon icon={<Users01 />} color="gray" variant="light" size="lg" />
        <div className="text-center">
          <h2 className="text-[16px] font-[600] text-primary">No agents yet</h2>
          <p className="mt-1 text-[14px] text-tertiary">
            Add your first agent to start managing your distributed AI team.
          </p>
        </div>
        <Link href="/agents/new">
          <Button color="primary" iconLeading={Plus} size="md">
            Create your first agent
          </Button>
        </Link>
      </main>
    )
  }

  // ── Populated state ──
  return (
    <main className="flex flex-1 flex-col gap-8 px-8 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-[600] font-sora text-primary tracking-tight">Agents</h1>
          <BadgeWithDot color="gray" type="pill-color" size="sm">
            {agents.length} agents
          </BadgeWithDot>
        </div>
        <Link href="/agents/new">
          <Button color="primary" iconLeading={Plus} size="sm">New Agent</Button>
        </Link>
      </div>

      {/* Filter bar */}
      <AgentFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={statusOptions}
        nodeFilter={nodeFilter}
        onNodeChange={setNodeFilter}
        nodeOptions={nodeOptions}
        deptFilter={deptFilter}
        onDeptChange={setDeptFilter}
        deptOptions={deptOptions}
        viewMode={viewMode}
        onViewModeChange={handleToggleView}
        isFiltered={isFiltered}
        onClearAll={handleClearAll}
      />

      {/* Content area */}
      {filteredAgents.length === 0 ? (
        /* Filtered — no results */
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <p className="text-[14px] text-tertiary">No agents match your filters.</p>
          <Button color="tertiary" size="sm" onPress={handleClearAll}>
            Clear all
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid view — responsive 1/2/3 columns */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.agent_id} agent={agent} />
          ))}
        </div>
      ) : (
        /* List/table view */
        <AgentTable agents={filteredAgents} />
      )}
    </main>
  )
}
