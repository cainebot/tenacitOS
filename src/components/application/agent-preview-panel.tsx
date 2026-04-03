'use client'

import { Avatar, Badge, BadgeWithDot, cx } from '@circos/ui'
import { CheckCircle } from '@untitledui/icons'
import type { CharacterDef, CreationDocStatus } from '@/types/agents'
import { IDENTITY_FILE_TYPES } from '@/types/agents'

// ── AgentPreviewPanel ─────────────────────────────────────────────────────────

interface AgentPreviewPanelProps {
  character: CharacterDef | null
  docs: CreationDocStatus[]
  agentName?: string
  agentRole?: string
}

/**
 * Right-side panel in the Conversation step.
 *
 * Shows:
 * - Agent avatar (character emoji), name placeholder, role placeholder
 * - "In progress" status badge
 * - 7-file identity document checklist with live completion state
 *
 * Checklist items transition pending → done as useAgentCreationChat parses
 * DOC markers from the AI stream.
 */
export function AgentPreviewPanel({
  character,
  docs,
  agentName,
  agentRole,
}: AgentPreviewPanelProps) {
  const displayName = agentName ?? character?.name ?? 'Agent name'
  const displayRole = agentRole ?? 'Role'

  return (
    <div className="flex flex-col gap-6 bg-secondary rounded-xl border border-secondary p-6 h-full">
      {/* Agent preview header */}
      <div className="flex flex-col items-center gap-3">
        <Avatar
          size="xl"
          initials={character?.emoji ?? '?'}
        />
        <p className="text-[16px] font-[600] text-primary text-center">
          {displayName}
        </p>
        <p className="text-[14px] text-tertiary text-center">
          {displayRole}
        </p>
        <BadgeWithDot color="gray" size="sm">
          In progress
        </BadgeWithDot>
      </div>

      {/* 7-file identity document checklist */}
      <div className="flex flex-col gap-2">
        <p className="text-[12px] font-[600] text-secondary uppercase tracking-wide">
          Identity Documents
        </p>

        <div className="flex flex-col gap-2">
          {IDENTITY_FILE_TYPES.map((fileType) => {
            const doc = docs.find((d) => d.fileType === fileType)
            const isDone = doc?.status === 'done'
            const isGenerating = doc?.status === 'generating'

            return (
              <div key={fileType} className="flex items-center gap-2">
                <CheckCircle
                  className={cx(
                    'size-4 shrink-0',
                    isDone
                      ? 'text-fg-brand-primary'
                      : isGenerating
                        ? 'text-fg-brand-primary animate-pulse'
                        : 'text-fg-quaternary'
                  )}
                />
                <span
                  className={cx(
                    'text-[13px]',
                    isDone ? 'text-primary font-[600]' : 'text-tertiary'
                  )}
                >
                  {fileType}
                </span>
                {isDone && (
                  <Badge color="success" size="sm">
                    Generated
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
