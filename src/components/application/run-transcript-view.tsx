'use client'

/**
 * run-transcript-view.tsx
 * Adapted from Paperclip RunTranscriptView — CircOS @circos/ui standards.
 *
 * Exports:
 *   - TranscriptToolCard      — collapsible card for tool_use / tool_result / error events
 *   - TranscriptThinkingBlock — expandable italic block for thinking events
 *   - TranscriptMessageBlock  — plain text/markdown message block
 *   - TranscriptCommandGroup  — groups multiple commands under one header
 *   - TranscriptToolGroup     — groups tool calls from the same agent turn
 *   - TranscriptEntry         — discriminated union for all block types
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertCircle, Tool01, CheckCircle } from '@untitledui/icons'
import { cx } from '@circos/ui'
import { MarkdownBody } from './markdown-body'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TranscriptBlockStatus = 'running' | 'completed' | 'error'

export interface TranscriptToolBlock {
  kind: 'tool'
  id: string
  toolName: string
  input?: Record<string, unknown>
  output?: string
  status: TranscriptBlockStatus
  isError?: boolean
  durationMs?: number
}

export interface TranscriptThinkingBlockData {
  kind: 'thinking'
  id: string
  content: string
}

export interface TranscriptMessageBlockData {
  kind: 'message'
  id: string
  content: string
  actorName?: string
}

export type TranscriptBlock =
  | TranscriptToolBlock
  | TranscriptThinkingBlockData
  | TranscriptMessageBlockData

// ---------------------------------------------------------------------------
// TranscriptToolCard
// Collapsible card for tool_use / tool_result / error.
// status='running'   → spinner-style header, no output
// status='completed' → green check, expandable output
// status='error'     → red alert, always-visible error text
// ---------------------------------------------------------------------------

interface TranscriptToolCardProps {
  toolName: string
  input?: Record<string, unknown>
  output?: string
  status: TranscriptBlockStatus
  isError?: boolean
  durationMs?: number
  /** When true, input args are expanded by default */
  defaultExpanded?: boolean
}

export function TranscriptToolCard({
  toolName,
  input,
  output,
  status,
  isError,
  durationMs,
  defaultExpanded = false,
}: TranscriptToolCardProps) {
  const [inputOpen, setInputOpen] = useState(defaultExpanded)
  const [outputOpen, setOutputOpen] = useState(false)

  const hasInput = input && Object.keys(input).length > 0
  const hasOutput = Boolean(output)

  const headerColor = isError || status === 'error'
    ? 'border-utility-error-300 bg-utility-error-50 dark:border-utility-error-800 dark:bg-utility-error-950'
    : status === 'running'
    ? 'border-secondary bg-secondary'
    : 'border-utility-success-300 bg-utility-success-50 dark:border-utility-success-800 dark:bg-utility-success-950'

  const iconColor = isError || status === 'error'
    ? 'text-utility-error-500'
    : status === 'running'
    ? 'text-fg-tertiary animate-spin'
    : 'text-utility-success-500'

  return (
    <div className="rounded-lg border border-secondary bg-primary overflow-hidden text-sm">
      {/* Header row */}
      <div className={cx('flex items-center gap-2 px-3 py-2', headerColor)}>
        {isError || status === 'error' ? (
          <AlertCircle className={cx('size-3.5 shrink-0', iconColor)} />
        ) : status === 'running' ? (
          <Tool01 className={cx('size-3.5 shrink-0', iconColor)} />
        ) : (
          <CheckCircle className={cx('size-3.5 shrink-0', iconColor)} />
        )}
        <span className="flex-1 truncate font-mono text-xs font-medium text-primary">
          {toolName}
        </span>
        {durationMs != null && status === 'completed' && (
          <span className="shrink-0 text-xs text-quaternary">{durationMs}ms</span>
        )}
        {status === 'running' && (
          <span className="shrink-0 text-xs text-quaternary">running…</span>
        )}
      </div>

      {/* Error output — always visible */}
      {(isError || status === 'error') && output && (
        <div className="border-t border-utility-error-200 px-3 py-2 dark:border-utility-error-800">
          <p className="text-xs text-error-primary">{output}</p>
        </div>
      )}

      {/* Input args — collapsible */}
      {hasInput && !(isError || status === 'error') && (
        <div className="border-t border-secondary">
          <button
            type="button"
            onClick={() => setInputOpen(!inputOpen)}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-tertiary transition hover:text-secondary"
          >
            {inputOpen ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            {inputOpen ? 'Hide input' : 'Show input'}
          </button>
          {inputOpen && (
            <pre className="max-h-[200px] overflow-y-auto border-t border-secondary bg-secondary px-3 py-2 font-mono text-[12px] leading-relaxed text-secondary">
              {JSON.stringify(input, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Output — collapsible for non-error */}
      {hasOutput && !(isError || status === 'error') && (
        <div className="border-t border-secondary">
          {output && output.length <= 300 ? (
            <div className="px-3 py-2">
              <MarkdownBody content={output} />
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setOutputOpen(!outputOpen)}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-tertiary transition hover:text-secondary"
              >
                {outputOpen ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                {outputOpen ? 'Hide output' : 'Show output'}
              </button>
              {outputOpen && (
                <div className="max-h-[300px] overflow-y-auto border-t border-secondary px-3 py-2">
                  <MarkdownBody content={output ?? ''} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TranscriptThinkingBlock
// Expandable italic block for agent thinking content.
// Collapsed by default — shows a one-line preview.
// ---------------------------------------------------------------------------

interface TranscriptThinkingBlockProps {
  content: string
  className?: string
}

export function TranscriptThinkingBlock({ content, className }: TranscriptThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false)
  const preview = content.slice(0, 120) + (content.length > 120 ? '…' : '')

  return (
    <div className={cx('rounded-md border border-secondary bg-secondary/40 px-3 py-2 text-sm', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-start gap-2 text-left"
      >
        {isOpen ? (
          <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-fg-quaternary" />
        ) : (
          <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-fg-quaternary" />
        )}
        <span className="flex-1 text-xs italic text-quaternary">
          {isOpen ? 'Thinking (hide)' : preview}
        </span>
      </button>
      {isOpen && (
        <div className="mt-2 border-t border-secondary pt-2">
          <p className="whitespace-pre-wrap text-xs italic leading-relaxed text-tertiary">
            {content}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TranscriptMessageBlock
// Plain text / markdown message from an agent or human.
// ---------------------------------------------------------------------------

interface TranscriptMessageBlockProps {
  content: string
  actorName?: string
  className?: string
}

export function TranscriptMessageBlock({ content, actorName, className }: TranscriptMessageBlockProps) {
  return (
    <div className={cx('rounded-md bg-secondary/30 px-3 py-2 text-sm', className)}>
      {actorName && (
        <p className="mb-1 text-xs font-medium text-secondary">{actorName}</p>
      )}
      <MarkdownBody content={content} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// TranscriptCommandGroup
// Groups multiple commands (tool calls) under a collapsible header.
// ---------------------------------------------------------------------------

interface TranscriptCommandGroupProps {
  label: string
  children: React.ReactNode
  defaultExpanded?: boolean
  className?: string
}

export function TranscriptCommandGroup({
  label,
  children,
  defaultExpanded = false,
  className,
}: TranscriptCommandGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded)

  return (
    <div className={cx('rounded-lg border border-secondary bg-primary', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {isOpen ? (
          <ChevronDown className="size-3.5 text-fg-tertiary" />
        ) : (
          <ChevronRight className="size-3.5 text-fg-tertiary" />
        )}
        <span className="text-xs font-medium text-secondary">{label}</span>
      </button>
      {isOpen && (
        <div className="flex flex-col gap-2 border-t border-secondary px-3 py-2">
          {children}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TranscriptToolGroup
// Groups tool calls from the same agent turn under a shared header.
// ---------------------------------------------------------------------------

interface TranscriptToolGroupProps {
  actorName: string
  tools: TranscriptToolBlock[]
  className?: string
}

export function TranscriptToolGroup({ actorName, tools, className }: TranscriptToolGroupProps) {
  const allDone = tools.every(t => t.status === 'completed')
  const hasError = tools.some(t => t.status === 'error' || t.isError)
  const running = tools.find(t => t.status === 'running')

  const summaryColor = hasError
    ? 'text-error-primary'
    : allDone
    ? 'text-success-primary'
    : 'text-secondary'

  const summary = hasError
    ? `${tools.length} tool(s) — error`
    : running
    ? `${tools.length} tool(s) — running ${running.toolName}…`
    : `${tools.length} tool call(s) completed`

  return (
    <TranscriptCommandGroup
      label={`${actorName}: ${summary}`}
      className={className}
    >
      <div className={cx('flex flex-col gap-2', summaryColor)}>
        {tools.map((tool) => (
          <TranscriptToolCard
            key={tool.id}
            toolName={tool.toolName}
            input={tool.input}
            output={tool.output}
            status={tool.status}
            isError={tool.isError}
            durationMs={tool.durationMs}
          />
        ))}
      </div>
    </TranscriptCommandGroup>
  )
}
