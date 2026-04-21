'use client'

import { Avatar, Badge, RadioGroup, Radio, Select, Toggle, cx } from '@circos/ui'
import { CheckCircle } from '@untitledui/icons'
import type { LLMMessage } from '@/types/agents'

// ── Inline component type definitions ────────────────────────────────────────

type InlineComponentDef =
  | { type: 'radio'; key: string; label: string; options: string[] }
  | { type: 'dropdown'; key: string; label: string; options: string[] }
  | { type: 'toggle'; key: string; label: string }

// ── ChatMessageBubble ─────────────────────────────────────────────────────────

interface ChatMessageBubbleProps {
  message: LLMMessage
  isLastAssistant: boolean
  onUpdateData: (messageId: string, data: Record<string, unknown>) => void
}

/**
 * Renders a single chat message (AI or user) with optional inline interactive
 * components embedded below the message text.
 *
 * - AI messages: left-aligned, bg-secondary surface
 * - User messages: right-aligned, max-w-[80%]
 * - System messages: not rendered
 * - Inline components become read-only once a newer AI message arrives
 */
export function ChatMessageBubble({ message, isLastAssistant, onUpdateData }: ChatMessageBubbleProps) {
  // Skip system messages
  if (message.role === 'system') return null

  const isAssistant = message.role === 'assistant'
  const inlineComponents = (message.data?.inlineComponents as InlineComponentDef[] | undefined) ?? []
  // Inline components are locked once this is no longer the last AI message
  const isLocked = !isLastAssistant

  if (isAssistant) {
    return (
      <div className="bg-secondary rounded-xl rounded-tl-sm p-4 w-full">
        {/* Message text */}
        <p className="text-[14px] text-primary whitespace-pre-wrap leading-relaxed">
          {message.content}
        </p>

        {/* Inline components */}
        {inlineComponents.length > 0 && (
          <div className="flex flex-col gap-3 mt-3">
            {inlineComponents.map((def) => (
              <div
                key={def.key}
                className="bg-primary border border-secondary rounded-lg p-3"
              >
                {def.type === 'radio' && (
                  <RadioGroup
                    label={def.label}
                    value={String(message.data?.[def.key] ?? '')}
                    onChange={(val) => onUpdateData(message.id, { [def.key]: val })}
                    isDisabled={isLocked}
                    aria-label={def.label}
                  >
                    {def.options.map((opt) => (
                      <Radio key={opt} value={opt} label={opt} />
                    ))}
                  </RadioGroup>
                )}

                {def.type === 'dropdown' && (
                  <Select
                    label={def.label}
                    selectedKey={String(message.data?.[def.key] ?? '')}
                    onSelectionChange={(val) =>
                      onUpdateData(message.id, { [def.key]: String(val) })
                    }
                    isDisabled={isLocked}
                    size="sm"
                    items={def.options.map((opt) => ({ id: opt, label: opt }))}
                  >
                    {(item) => (
                      <Select.Item id={item.id}>
                        {item.label}
                      </Select.Item>
                    )}
                  </Select>
                )}

                {def.type === 'toggle' && (
                  <div className="flex items-center gap-3">
                    <span className={cx('text-[14px]', isLocked ? 'text-tertiary' : 'text-secondary')}>
                      {def.label}
                    </span>
                    <Toggle
                      isSelected={!!message.data?.[def.key]}
                      onChange={(val) => onUpdateData(message.id, { [def.key]: val })}
                      isDisabled={isLocked}
                      size="sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // User message — right aligned
  return (
    <div className="flex justify-end">
      <div className="bg-primary border border-secondary rounded-xl rounded-tr-sm p-3 max-w-[80%]">
        <p className="text-[14px] text-primary whitespace-pre-wrap leading-relaxed">
          {message.content}
        </p>
      </div>
    </div>
  )
}
