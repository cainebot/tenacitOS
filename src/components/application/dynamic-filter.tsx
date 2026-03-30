"use client"

import { type FC, type ReactNode, useState, useCallback, useMemo } from "react"
import {
  FilterLines,
  Plus,
  DotsHorizontal,
  ChevronDown,
  ChevronUpDouble,
  Minus,
  User01,
  ChevronUp,
  Calendar,
  Tag01,
  CheckDone01,
  Equal,
  XClose,
} from "@untitledui/icons"
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from "react-aria-components"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Select, Dropdown, Badge, Button, cx } from "@circos/ui"
import { GripVertical } from "@/components/icons/grip-vertical"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FilterOperator = "equal" | "not_equal" | "greater" | "greater_equal" | "less" | "less_equal" | "contains" | "not_contains"

export type FilterFieldType = "member" | "priority" | "date" | "tags" | "card_type"

export interface FilterFieldDefinition {
  type: FilterFieldType
  label: string
  icon: FC<{ className?: string }>
  operators: FilterOperator[]
  values: { id: string; label: string; icon?: FC<{ className?: string }>; avatarUrl?: string }[]
}

export interface FilterRow {
  id: string
  fieldType: FilterFieldType
  operator: FilterOperator
  value: string | null
}

export interface DynamicFilterProps {
  fields: FilterFieldDefinition[]
  filters: FilterRow[]
  onFiltersChange?: (filters: FilterRow[]) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Operator config
// ---------------------------------------------------------------------------

const operatorLabels: Record<FilterOperator, string> = {
  equal: "Equal to",
  not_equal: "Not equal to",
  greater: "Greater than",
  greater_equal: "Greater or equal",
  less: "Less than",
  less_equal: "Less or equal",
  contains: "Contains",
  not_contains: "Not contains",
}

// ---------------------------------------------------------------------------
// Sortable Filter Row
// ---------------------------------------------------------------------------

function SortableFilterRow({
  row,
  fields,
  onUpdate,
  onRemove,
}: {
  row: FilterRow
  fields: FilterFieldDefinition[]
  onUpdate: (id: string, patch: Partial<FilterRow>) => void
  onRemove: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const fieldDef = fields.find((f) => f.type === row.fieldType)
  const valueDef = fieldDef?.values.find((v) => v.id === row.value)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex w-[588px] items-center gap-2 p-2"
    >
      {/* Drag handle */}
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        type="button"
        className="shrink-0 cursor-grab touch-none text-fg-quaternary outline-none active:cursor-grabbing"
      >
        <GripVertical className="size-6" />
      </button>

      {/* Field selector */}
      <div className="min-w-0 flex-1">
        <Select
          size="sm"
          placeholder="Field"
          placeholderIcon={fieldDef?.icon}
          popoverClassName="min-w-[200px]"
          selectedKey={row.fieldType}
          onSelectionChange={(key) => {
            if (key) onUpdate(row.id, { fieldType: key as FilterFieldType, value: null })
          }}
        >
          {fields.map((f) => (
            <Select.Item key={f.type} id={f.type} label={f.label} icon={f.icon} />
          ))}
        </Select>
      </div>

      {/* Operator selector */}
      <div className="w-[150px] shrink-0">
        <Select
          size="sm"
          placeholder="Operator"
          placeholderIcon={Equal}
          popoverClassName="min-w-[200px]"
          selectedKey={row.operator}
          onSelectionChange={(key) => {
            if (key) onUpdate(row.id, { operator: key as FilterOperator })
          }}
        >
          {(fieldDef?.operators ?? []).map((op) => (
            <Select.Item key={op} id={op} label={operatorLabels[op]} />
          ))}
        </Select>
      </div>

      {/* Value selector */}
      <div className="min-w-0 flex-1">
        <Select
          size="sm"
          placeholder="Select value"
          placeholderIcon={valueDef?.icon}
          popoverClassName="min-w-[200px]"
          selectedKey={row.value ?? undefined}
          onSelectionChange={(key) => {
            if (key) onUpdate(row.id, { value: String(key) })
          }}
        >
          {(fieldDef?.values ?? []).map((v) => (
            <Select.Item
              key={v.id}
              id={v.id}
              label={v.label}
              icon={v.icon}
              avatarUrl={v.avatarUrl}
            />
          ))}
        </Select>
      </div>

      {/* Row actions menu */}
      <Dropdown.Root>
        <AriaButton
          aria-label="Filter options"
          className="shrink-0 cursor-pointer rounded-md p-1 text-fg-quaternary outline-none transition hover:text-fg-quaternary_hover"
        >
          <DotsHorizontal className="size-5" />
        </AriaButton>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu
            onAction={(key) => {
              if (key === "remove") onRemove(row.id)
            }}
          >
            <Dropdown.Item id="remove" label="Remove filter" icon={XClose} />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Filter Button with dropdown
// ---------------------------------------------------------------------------

function AddFilterButton({
  fields,
  onAdd,
}: {
  fields: FilterFieldDefinition[]
  onAdd: (fieldType: FilterFieldType) => void
}) {
  return (
    <Dropdown.Root>
      <AriaButton className="flex w-fit cursor-pointer items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-tertiary outline-none transition hover:bg-primary_hover">
        <Plus className="size-5" />
        <span className="px-0.5">Add filter</span>
        <ChevronDown className="size-5 text-fg-quaternary" />
      </AriaButton>
      <Dropdown.Popover placement="bottom start">
        <Dropdown.Menu onAction={(key) => onAdd(key as FilterFieldType)}>
          {fields.map((f) => (
            <Dropdown.Item key={f.type} id={f.type} label={f.label} icon={f.icon} />
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  )
}

// ---------------------------------------------------------------------------
// DynamicFilter — main component
// ---------------------------------------------------------------------------

export function DynamicFilter({
  fields,
  filters: filtersProp,
  onFiltersChange,
  className,
}: DynamicFilterProps) {
  const [internalFilters, setInternalFilters] = useState<FilterRow[]>([])
  const filters = filtersProp ?? internalFilters

  const updateFilters = useCallback(
    (next: FilterRow[]) => {
      setInternalFilters(next)
      onFiltersChange?.(next)
    },
    [onFiltersChange],
  )

  const handleUpdate = useCallback(
    (id: string, patch: Partial<FilterRow>) => {
      updateFilters(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    },
    [filters, updateFilters],
  )

  const handleRemove = useCallback(
    (id: string) => {
      updateFilters(filters.filter((f) => f.id !== id))
    },
    [filters, updateFilters],
  )

  const handleAdd = useCallback(
    (fieldType: FilterFieldType) => {
      const fieldDef = fields.find((f) => f.type === fieldType)
      const newFilter: FilterRow = {
        id: `filter-${Date.now()}`,
        fieldType,
        operator: fieldDef?.operators[0] ?? "equal",
        value: null,
      }
      updateFilters([...filters, newFilter])
    },
    [fields, filters, updateFilters],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const filterIds = useMemo(() => filters.map((f) => f.id), [filters])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = filters.findIndex((f) => f.id === String(active.id))
      const newIndex = filters.findIndex((f) => f.id === String(over.id))
      if (oldIndex !== -1 && newIndex !== -1) {
        updateFilters(arrayMove(filters, oldIndex, newIndex))
      }
    },
    [filters, updateFilters],
  )

  const activeCount = filters.length

  return (
    <AriaDialogTrigger>
      <Button
        color="tertiary"
        size="sm"
        iconLeading={FilterLines}
        iconTrailing={activeCount > 0 ? () => (
          <Badge type="color" size="sm" color="brand">
            {activeCount}
          </Badge>
        ) : undefined}
        className={className}
      >
        Filter
      </Button>
      <AriaPopover
        placement="bottom end"
        offset={4}
        className={({ isEntering, isExiting }) =>
          cx(
            "w-fit origin-(--trigger-anchor-point) overflow-hidden rounded-xl border border-primary bg-primary p-4 shadow-lg will-change-transform",
            isEntering && "duration-150 ease-out animate-in fade-in slide-in-from-top-0.5",
            isExiting && "duration-100 ease-in animate-out fade-out slide-out-to-top-0.5",
          )
        }
      >
        <AriaDialog className="outline-none">
          {() => (
            <div className="flex flex-col gap-0">
              <p className="text-md font-semibold text-primary">Dynamic filter</p>

              {/* Sortable filter rows */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={filterIds} strategy={verticalListSortingStrategy}>
                  {filters.map((row) => (
                    <SortableFilterRow
                      key={row.id}
                      row={row}
                      fields={fields}
                      onUpdate={handleUpdate}
                      onRemove={handleRemove}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {filters.length === 0 && (
                <p className="px-2 py-4 text-sm text-quaternary">No filters applied. Add a filter to get started.</p>
              )}

              {/* Add filter + Clear all */}
              <div className="flex items-center justify-between">
                <AddFilterButton fields={fields} onAdd={handleAdd} />
                {filters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => updateFilters([])}
                    className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-tertiary transition hover:bg-primary_hover hover:text-secondary"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}
        </AriaDialog>
      </AriaPopover>
    </AriaDialogTrigger>
  )
}

// ---------------------------------------------------------------------------
// Default field definitions (convenience export)
// ---------------------------------------------------------------------------

export const defaultFilterFields: FilterFieldDefinition[] = [
  {
    type: "member",
    label: "Member",
    icon: User01,
    operators: ["equal", "not_equal"],
    values: [],
  },
  {
    type: "priority",
    label: "Priority",
    icon: ChevronUp,
    operators: ["equal", "not_equal", "greater", "greater_equal", "less", "less_equal"],
    values: [
      { id: "critical", label: "Critical", icon: () => <ChevronUpDouble className="size-5 text-utility-error-500" /> },
      { id: "high", label: "High", icon: () => <ChevronUp className="size-5 text-utility-error-500" /> },
      { id: "medium", label: "Medium", icon: () => <Minus className="size-5 text-utility-warning-500" /> },
      { id: "low", label: "Low", icon: () => <ChevronDown className="size-5 text-utility-blue-500" /> },
    ],
  },
  {
    type: "date",
    label: "Date",
    icon: Calendar,
    operators: ["equal", "greater", "greater_equal", "less", "less_equal"],
    values: [],
  },
  {
    type: "tags",
    label: "Tags",
    icon: Tag01,
    operators: ["equal", "not_equal", "contains", "not_contains"],
    values: [],
  },
  {
    type: "card_type",
    label: "Card type",
    icon: CheckDone01,
    operators: ["equal", "not_equal"],
    values: [
      { id: "epic", label: "Epic" },
      { id: "story", label: "Story" },
      { id: "task", label: "Task" },
      { id: "bug", label: "Bug" },
      { id: "subtask", label: "Subtask" },
      { id: "spike", label: "Spike" },
      { id: "research", label: "Research" },
    ],
  },
]
