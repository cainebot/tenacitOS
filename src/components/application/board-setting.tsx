'use client'

import { useState, useMemo } from 'react'
import { Button, PageHeader } from '@circos/ui'
import { ArrowNarrowLeft, HomeLine } from '@untitledui/icons'
import { KanbanBoard, type KanbanBoardColumn } from './kanban-board'
import type { KanbanColumnItem } from './kanban-column'
import { StateCard } from './state-card'
import { StateCreateInline } from './state-create-inline'
import { DeleteStateModal } from './delete-state-modal'
import type { ProjectStateRow, StateCategory } from '@/types/project'
import type { ColumnWithStates } from '@/hooks/use-board-settings'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StateCardItem extends KanbanColumnItem {
  id: string // mapped from state_id
  state: ProjectStateRow
  taskCount: number
}

export interface BoardSettingProps {
  /** Board columns with their assigned state IDs */
  columns: ColumnWithStates[]
  /** All project states */
  states: ProjectStateRow[]
  /** Card count per state_id */
  cardCounts: Record<string, number>
  /** Breadcrumb info */
  projectName: string
  projectSlug: string
  /** Callbacks */
  onBack?: () => void
  onCreateState?: (data: { name: string; category: StateCategory; color?: string }) => Promise<unknown>
  onDeleteState?: (stateId: string, targetStateId?: string) => Promise<boolean>
  onColumnsChange?: (columns: KanbanBoardColumn<StateCardItem>[]) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BoardSetting({
  columns,
  states,
  cardCounts,
  projectName,
  projectSlug,
  onBack,
  onCreateState,
  onDeleteState,
  onColumnsChange,
}: BoardSettingProps) {
  const [deleteTarget, setDeleteTarget] = useState<ProjectStateRow | null>(null)

  // Convert ColumnWithStates[] to KanbanBoardColumn<StateCardItem>[]
  const boardColumns = useMemo<KanbanBoardColumn<StateCardItem>[]>(() => {
    return columns.map((col) => ({
      id: col.column_id,
      title: col.name,
      items: col.state_ids
        .map((stateId) => {
          const state = states.find((s) => s.state_id === stateId)
          if (!state) return null
          return {
            id: state.state_id,
            state,
            taskCount: cardCounts[state.state_id] ?? 0,
          }
        })
        .filter(Boolean) as StateCardItem[],
    }))
  }, [columns, states, cardCounts])

  // Compute which states are assigned to any column
  const assignedStateIds = useMemo(() => {
    const ids = new Set<string>()
    for (const col of columns) {
      for (const id of col.state_ids) ids.add(id)
    }
    return ids
  }, [columns])

  // Unassigned states — not in any column
  const unassignedStates = useMemo(
    () => states.filter((s) => !assignedStateIds.has(s.state_id)),
    [states, assignedStateIds],
  )

  return (
    <div className="flex h-full flex-col gap-8 pt-4">
      {/* ── Header ── */}
      <div className="px-8">
        <PageHeader
          title="Board setting"
          breadcrumbs={[
            { label: 'Home', icon: HomeLine, href: '/' },
            { label: projectName, href: `/projects/${projectSlug}` },
            { label: 'Board setting' },
          ]}
          actions={
            <Button
              size="sm"
              color="link-gray"
              iconLeading={ArrowNarrowLeft}
              onClick={onBack}
            >
              Back to board
            </Button>
          }
        />
      </div>

      {/* ── Columns: Unassigned (fixed) + KanbanBoard (draggable) ── */}
      <div className="flex flex-1 gap-4 overflow-x-auto px-8 pb-12">
        {/* Unassigned column — FIXED, non-draggable, outside KanbanBoard */}
        <div className="flex w-[288px] shrink-0 flex-col gap-2 rounded-lg bg-secondary_alt p-2">
          <div className="flex flex-col">
            <p className="text-md font-semibold text-secondary">
              Estados sin asignar
            </p>
            <p className="text-xs text-tertiary">
              Las actividades con estos estados no serán visibles.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {unassignedStates.map((state) => (
              <StateCard
                key={state.state_id}
                state={state}
                taskCount={cardCounts[state.state_id] ?? 0}
                onDeleteClick={setDeleteTarget}
              />
            ))}
          </div>
          {onCreateState && (
            <div className="rounded-lg bg-secondary">
              <StateCreateInline onCreateState={onCreateState} />
            </div>
          )}
        </div>

        {/* KanbanBoard — all DnD, column reorder, add section built-in */}
        <KanbanBoard<StateCardItem>
          columns={boardColumns}
          onColumnsChange={onColumnsChange}
          size="sm"
          renderCard={(item) => (
            <StateCard
              state={item.state}
              taskCount={item.taskCount}
              onDeleteClick={setDeleteTarget}
            />
          )}
          renderDragOverlay={(item) => (
            <StateCard
              state={item.state}
              taskCount={item.taskCount}
            />
          )}
        />
      </div>

      {/* ── Delete Modal ── */}
      <DeleteStateModal
        state={deleteTarget}
        states={states}
        onDeleteState={onDeleteState ?? (async () => false)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
