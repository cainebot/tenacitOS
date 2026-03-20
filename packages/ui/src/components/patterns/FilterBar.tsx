"use client"

import { type ReactNode } from "react"
import type { Key } from "react-aria-components"
import { Input } from "../base/input"
import { Select, SelectItem } from "../base/select"
import { Toggle } from "../base/toggle"
import { cx } from "../../utils/cx"

export interface FilterOption {
  id: string
  label: string
}

export interface FilterBarProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: FilterBarFilter[]
  toggles?: FilterBarToggle[]
  actions?: ReactNode
  className?: string
}

export interface FilterBarFilter {
  key: string
  label: string
  options: FilterOption[]
  selectedKey?: Key | null
  onSelectionChange?: (key: Key | null) => void
  placeholder?: string
}

export interface FilterBarToggle {
  key: string
  label: string
  isSelected?: boolean
  onChange?: (isSelected: boolean) => void
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  toggles = [],
  actions,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center gap-3 rounded-xl border border-primary/10 bg-primary/[0.03] p-3",
        className
      )}
    >
      {onSearchChange !== undefined && (
        <div className="min-w-[200px] flex-1">
          <Input
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            size="sm"
          />
        </div>
      )}

      {filters.map((filter) => (
        <div key={filter.key} className="min-w-[140px]">
          <Select
            label={filter.label}
            selectedKey={filter.selectedKey}
            onSelectionChange={filter.onSelectionChange}
            placeholder={filter.placeholder ?? `All ${filter.label}`}
          >
            {filter.options.map((opt) => (
              <SelectItem key={opt.id} id={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </Select>
        </div>
      ))}

      {toggles.map((toggle) => (
        <div key={toggle.key} className="flex items-center gap-2">
          <Toggle
            isSelected={toggle.isSelected}
            onChange={toggle.onChange}
          >
            {toggle.label}
          </Toggle>
        </div>
      ))}

      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}
