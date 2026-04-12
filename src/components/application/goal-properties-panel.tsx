'use client'

import { Select, cx } from '@circos/ui'
import { PropertiesValues } from './properties-values'
import type { GoalRow, GoalStatus } from '@/types/project'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EpicOption {
  card_id: string
  code: string
  title: string
}

export interface GoalPropertiesPanelProps {
  goal: GoalRow
  epics: EpicOption[]
  projectSlug: string
  onEpicChange: (epicId: string | null) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoalPropertiesPanel({
  goal,
  epics,
  projectSlug,
  onEpicChange,
}: GoalPropertiesPanelProps) {
  const linkedEpic = goal.epic_id
    ? epics.find((e) => e.card_id === goal.epic_id)
    : null

  return (
    <div className={cx('rounded-xl border border-secondary bg-primary p-4')}>
      <h3 className="text-sm font-semibold text-secondary mb-3">Properties</h3>

      <div className="space-y-0 divide-y divide-secondary">
        {/* Row 1: Status — auto-calculated, read-only per D-12 */}
        <PropertiesValues
          label="Status"
          variant={{ type: 'status', value: goal.status as GoalStatus }}
        />

        {/* Row 2: Created — read-only */}
        <PropertiesValues
          label="Created"
          variant={{ type: 'date', value: formatDate(goal.created_at) }}
        />

        {/* Row 3: Updated — read-only */}
        <PropertiesValues
          label="Updated"
          variant={{ type: 'date', value: formatDate(goal.updated_at) }}
        />

        {/* Row 4: Epic — Select dropdown per D-14, or link when set */}
        {linkedEpic ? (
          <div className="flex items-center py-2">
            <PropertiesValues
              label="Epic"
              variant={{
                type: 'epic',
                code: linkedEpic.code,
                href: `/projects/${projectSlug}?tab=board`,
              }}
            />
            <button
              type="button"
              onClick={() => onEpicChange(null)}
              className="ml-2 text-xs text-tertiary hover:text-error-primary leading-none"
              aria-label="Remove epic"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="flex items-center py-2">
            <span className="w-24 shrink-0 text-sm text-tertiary">Epic</span>
            <div className="flex-1 min-w-0">
              <Select
                placeholder="None"
                selectedKey={goal.epic_id ?? null}
                onSelectionChange={(key) =>
                  onEpicChange(key ? String(key) : null)
                }
                items={epics}
                size="sm"
              >
                {(epic) => (
                  <Select.Item id={epic.card_id} textValue={epic.title}>
                    <span className="text-sm">
                      {epic.code} — {epic.title}
                    </span>
                  </Select.Item>
                )}
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
