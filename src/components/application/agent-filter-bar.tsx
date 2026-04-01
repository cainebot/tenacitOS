'use client'

import { Button, ButtonUtility, Input, Select, cx } from '@circos/ui'
import { SearchMd, XClose, Grid01, List } from '@untitledui/icons'

export interface SelectItemType {
  id: string
  label?: string
}

export interface AgentFilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  statusOptions: SelectItemType[]
  nodeFilter: string
  onNodeChange: (value: string) => void
  nodeOptions: SelectItemType[]
  deptFilter: string
  onDeptChange: (value: string) => void
  deptOptions: SelectItemType[]
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  isFiltered: boolean
  onClearAll: () => void
}

export function AgentFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  statusOptions,
  nodeFilter,
  onNodeChange,
  nodeOptions,
  deptFilter,
  onDeptChange,
  deptOptions,
  viewMode,
  onViewModeChange,
  isFiltered,
  onClearAll,
}: AgentFilterBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search input — 200ms debounce handled by parent via useDebounce */}
      <Input
        size="sm"
        icon={SearchMd}
        placeholder="Search agents..."
        aria-label="Search agents"
        value={searchQuery}
        onChange={onSearchChange}
        className="w-full min-w-[200px] max-w-[280px]"
      />

      {/* Status filter */}
      <Select
        size="sm"
        placeholder="Status"
        aria-label="Filter by status"
        items={statusOptions}
        selectedKey={statusFilter}
        onSelectionChange={(key) => onStatusChange(String(key))}
      >
        {(item: SelectItemType) => <Select.Item id={item.id}>{item.label ?? item.id}</Select.Item>}
      </Select>

      {/* Node filter */}
      <Select
        size="sm"
        placeholder="Node"
        aria-label="Filter by node"
        items={nodeOptions}
        selectedKey={nodeFilter}
        onSelectionChange={(key) => onNodeChange(String(key))}
      >
        {(item: SelectItemType) => <Select.Item id={item.id}>{item.label ?? item.id}</Select.Item>}
      </Select>

      {/* Department filter */}
      <Select
        size="sm"
        placeholder="Department"
        aria-label="Filter by department"
        items={deptOptions}
        selectedKey={deptFilter}
        onSelectionChange={(key) => onDeptChange(String(key))}
      >
        {(item: SelectItemType) => <Select.Item id={item.id}>{item.label ?? item.id}</Select.Item>}
      </Select>

      {/* Clear all — visible only when any filter is active */}
      {isFiltered && (
        <Button color="tertiary" size="sm" iconLeading={XClose} onClick={onClearAll}>
          Clear all
        </Button>
      )}

      {/* Grid / List toggle — pushed to far right */}
      <div className="ml-auto flex items-center gap-1">
        <ButtonUtility
          icon={Grid01}
          size="sm"
          color="tertiary"
          tooltip="Grid view"
          aria-pressed={viewMode === 'grid'}
          className={cx(viewMode === 'grid' && 'bg-active')}
          onClick={() => onViewModeChange('grid')}
        />
        <ButtonUtility
          icon={List}
          size="sm"
          color="tertiary"
          tooltip="List view"
          aria-pressed={viewMode === 'list'}
          className={cx(viewMode === 'list' && 'bg-active')}
          onClick={() => onViewModeChange('list')}
        />
      </div>
    </div>
  )
}
