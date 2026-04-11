'use client'

import { type FC, useState, useEffect } from 'react'
import { Button, Input, Select, AvatarLabelGroup, cx } from '@circos/ui'
import { XClose } from '@untitledui/icons'
import type { OrgNode } from './team-chart-node'
import type { AgentProjectRoleRow } from '@/types/project'

// ---------------------------------------------------------------------------
// TeamChartSidePanel
// ---------------------------------------------------------------------------

interface TeamChartSidePanelProps {
  node: OrgNode
  roleRow: AgentProjectRoleRow
  availableAgents: OrgNode[]
  onSave: (id: string, data: { title?: string; reports_to?: string | null }) => Promise<void>
  onClose: () => void
  isSaving: boolean
  error: string | null
}

export const TeamChartSidePanel: FC<TeamChartSidePanelProps> = ({
  node,
  roleRow,
  availableAgents,
  onSave,
  onClose,
  isSaving,
  error,
}) => {
  const [editTitle, setEditTitle] = useState(roleRow.title ?? '')
  const [editReportsTo, setEditReportsTo] = useState<string | null>(roleRow.reports_to)

  // Re-initialize when the selected node changes
  useEffect(() => {
    setEditTitle(roleRow.title ?? '')
    setEditReportsTo(roleRow.reports_to)
  }, [roleRow.id, roleRow.title, roleRow.reports_to])

  const handleSave = async () => {
    await onSave(roleRow.id, {
      title: editTitle || undefined,
      reports_to: editReportsTo,
    })
  }

  // Filter out current node from supervisor dropdown (cannot report to self)
  const supervisorOptions = availableAgents.filter(
    (a) => a.agent_id !== node.agent_id
  )

  return (
    <div
      className={cx(
        'fixed right-0 top-0 h-full w-80',
        'bg-primary border-l border-secondary',
        'flex flex-col z-50',
        'shadow-xl'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-secondary flex-shrink-0">
        <h2 className="font-display text-lg font-semibold text-primary">
          Editar rol en proyecto
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center rounded-md p-1 text-quaternary hover:text-secondary hover:bg-secondary transition-colors"
          aria-label="Cerrar panel"
        >
          <XClose className="size-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        {/* Agent avatar section */}
        <div className="flex items-center gap-3">
          <AvatarLabelGroup
            src={node.avatar_url ?? undefined}
            initials={node.emoji}
            title={node.name}
            subtitle={node.role ?? ''}
            size="md"
          />
        </div>

        {/* Title input */}
        <Input
          label="Titulo en este proyecto"
          placeholder="Titulo en este proyecto (ej. Prospector Lead)"
          value={editTitle}
          onChange={(v) => setEditTitle(v)}
          isDisabled={isSaving}
        />

        {/* Reports to select */}
        <Select
          label="Reporta a"
          placeholder="Selecciona supervisor"
          selectedKey={editReportsTo}
          onSelectionChange={(key) => setEditReportsTo(key as string | null)}
          items={supervisorOptions}
          isDisabled={isSaving}
        >
          {(agent) => (
            <Select.Item id={agent.agent_id}>
              {agent.name}
            </Select.Item>
          )}
        </Select>

        {/* Clear reports_to option */}
        {editReportsTo && (
          <button
            type="button"
            onClick={() => setEditReportsTo(null)}
            className="text-sm text-brand-secondary hover:underline text-left"
          >
            Reporta directamente a ti (sin supervisor)
          </button>
        )}

        {/* Error display */}
        {error && (
          <p className="text-sm text-error-primary">{error}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 px-5 py-4 border-t border-secondary flex-shrink-0">
        <Button
          color="primary"
          isLoading={isSaving}
          showTextWhileLoading
          onClick={handleSave}
        >
          Guardar
        </Button>
        <Button
          color="secondary"
          onClick={onClose}
          isDisabled={isSaving}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
