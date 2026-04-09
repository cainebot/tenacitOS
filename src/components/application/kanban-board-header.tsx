"use client"

import { useState } from "react"
import { Plus, SwitchVertical01, Settings04, SearchMd } from "@untitledui/icons"
import { Button, Dropdown, InputBase, cx } from "@circos/ui"
import { BotIcon } from "@/components/icons/bot-icon"
import { useAgentBoard } from "@/contexts/agent-board-context"
import {
  DynamicFilter,
  type FilterFieldDefinition,
  type FilterRow,
} from "./dynamic-filter"

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

export type SortOption = "alpha_asc" | "alpha_desc" | "date_asc" | "date_desc"

const sortItems = [
  { id: "alpha_asc" as const, label: "A → Z" },
  { id: "alpha_desc" as const, label: "Z → A" },
  { id: "date_asc" as const, label: "Oldest first" },
  { id: "date_desc" as const, label: "Newest first" },
]

// ---------------------------------------------------------------------------
// KanbanBoardHeader
// ---------------------------------------------------------------------------

export interface KanbanBoardHeaderProps {
  onAddTask?: () => void
  onSettings?: () => void
  filterFields: FilterFieldDefinition[]
  filters?: FilterRow[]
  onFiltersChange?: (filters: FilterRow[]) => void
  sortBy?: SortOption | null
  onSortChange?: (sort: SortOption | null) => void
  search?: string
  onSearchChange?: (search: string) => void
  className?: string
}

export function KanbanBoardHeader({
  onAddTask,
  onSettings,
  filterFields,
  filters,
  onFiltersChange,
  sortBy: sortByProp,
  onSortChange,
  search: searchProp,
  onSearchChange,
  className,
}: KanbanBoardHeaderProps) {
  const { agentBoardActive, setAgentBoardActive } = useAgentBoard()
  const [internalSort, setInternalSort] = useState<SortOption | null>(null)
  const [internalSearch, setInternalSearch] = useState("")

  const sortBy = sortByProp ?? internalSort
  const search = searchProp ?? internalSearch

  const handleSortChange = (key: SortOption) => {
    const next = sortBy === key ? null : key
    setInternalSort(next)
    onSortChange?.(next)
  }

  const handleSearchChange = (value: string) => {
    setInternalSearch(value)
    onSearchChange?.(value)
  }

  return (
    <div
      className={cx(
        "flex items-center justify-between border-b border-secondary bg-primary px-6 py-3",
        className,
      )}
    >
      {/* Left: Add task + Agent's board */}
      <div className="flex items-center gap-2">
        <Button
          color="primary"
          size="sm"
          iconLeading={Plus}
          onClick={onAddTask}
        >
          Add task
        </Button>
        <Button
          color="secondary"
          size="sm"
          iconLeading={BotIcon}
          onClick={() => setAgentBoardActive(!agentBoardActive)}
          className={agentBoardActive ? "!ring-0 !font-semibold *:data-icon:!text-fg-brand-primary" : undefined}
          style={agentBoardActive ? {
            background: "color-mix(in srgb, var(--bg-brand-primary, #6172F3), transparent 80%)",
            border: "1px solid var(--color-border-brand, #8098F9)",
          } : undefined}
        >
          Agent&apos;s board
        </Button>
      </div>

      {/* Right: Filter + Order + Settings + Search */}
      <div className="flex items-center gap-1">
        {/* Filter */}
        <DynamicFilter
          fields={filterFields}
          filters={filters ?? []}
          onFiltersChange={onFiltersChange}
        />

        {/* Order */}
        <Dropdown.Root>
          <Button
            color={sortBy ? "secondary" : "tertiary"}
            size="sm"
            iconLeading={SwitchVertical01}
          >
            Order
          </Button>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu
              selectionMode="single"
              selectedKeys={sortBy ? new Set([sortBy]) : new Set()}
              onAction={(key) => handleSortChange(key as SortOption)}
            >
              {sortItems.map((item) => (
                <Dropdown.Item key={item.id} id={item.id} label={item.label} />
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>

        {/* Settings — navigates to board-setting page */}
        <Button
          color="tertiary"
          size="sm"
          iconLeading={Settings04}
          onClick={onSettings}
        >
          Settings
        </Button>

        {/* Search */}
        <div className="w-[225px]">
          <InputBase
            size="sm"
            placeholder="Search on board"
            icon={SearchMd}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
