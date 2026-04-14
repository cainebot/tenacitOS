'use client'

/**
 * run-transcript-view-full.tsx
 * Direct port of Paperclip's RunTranscriptView — adapted for CircOS @circos/ui standards.
 *
 * Changes from Paperclip source:
 *   - cn() → cx() from @circos/ui
 *   - lucide-react → @untitledui/icons (GitCompare → GitBranch01, CircleAlert → AlertCircle, User → User01, Wrench → Tool01)
 *   - MarkdownBody: children → content prop
 *   - TranscriptEntry: self-contained discriminated union (no @paperclipai/adapter-utils dep)
 *   - formatTokens: inline implementation
 */

import { useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  GitBranch01,
  TerminalSquare,
  User01,
  Tool01,
} from '@untitledui/icons'
import { cx } from '@circos/ui'
import { MarkdownBody } from './markdown-body'

// ---------------------------------------------------------------------------
// TranscriptEntry — self-contained discriminated union
// (replaces @paperclipai/adapter-utils dependency)
// ---------------------------------------------------------------------------

export type TranscriptEntry =
  | { kind: 'assistant'; ts: string; text: string; delta?: boolean }
  | { kind: 'user'; ts: string; text: string; delta?: boolean }
  | { kind: 'thinking'; ts: string; text: string; delta?: boolean }
  | { kind: 'tool_call'; ts: string; text: string; name: string; input: unknown; toolUseId?: string }
  | { kind: 'tool_result'; ts: string; text: string; toolUseId: string; content: string; isError?: boolean; toolName?: string }
  | { kind: 'init'; ts: string; text: string; model: string; sessionId?: string }
  | { kind: 'result'; ts: string; text: string; isError: boolean; errors: string[]; inputTokens: number; outputTokens: number; costUsd: number }
  | { kind: 'stderr'; ts: string; text: string }
  | { kind: 'system'; ts: string; text: string }
  | { kind: 'diff'; ts: string; text: string; changeType: 'add' | 'remove' | 'context' | 'hunk' | 'file_header' | 'truncation' }
  | { kind: 'stdout'; ts: string; text: string }

// ---------------------------------------------------------------------------
// Public API types
// ---------------------------------------------------------------------------

export type TranscriptMode = 'nice' | 'raw'
export type TranscriptDensity = 'comfortable' | 'compact'

interface RunTranscriptViewProps {
  entries: TranscriptEntry[]
  mode?: TranscriptMode
  density?: TranscriptDensity
  limit?: number
  streaming?: boolean
  collapseStdout?: boolean
  emptyMessage?: string
  className?: string
  thinkingClassName?: string
}

// ---------------------------------------------------------------------------
// Internal block types (normalizeTranscript output)
// ---------------------------------------------------------------------------

type TranscriptBlock =
  | { type: 'message'; role: 'assistant' | 'user'; ts: string; text: string; streaming: boolean }
  | { type: 'thinking'; ts: string; text: string; streaming: boolean }
  | { type: 'tool'; ts: string; endTs?: string; name: string; toolUseId?: string; input: unknown; result?: string; isError?: boolean; status: 'running' | 'completed' | 'error' }
  | { type: 'activity'; ts: string; activityId?: string; name: string; status: 'running' | 'completed' }
  | { type: 'command_group'; ts: string; endTs?: string; items: Array<{ ts: string; endTs?: string; input: unknown; result?: string; isError?: boolean; status: 'running' | 'completed' | 'error' }> }
  | { type: 'tool_group'; ts: string; endTs?: string; items: Array<{ ts: string; endTs?: string; name: string; input: unknown; result?: string; isError?: boolean; status: 'running' | 'completed' | 'error' }> }
  | { type: 'stderr_group'; ts: string; endTs?: string; lines: Array<{ ts: string; text: string }> }
  | { type: 'system_group'; ts: string; endTs?: string; lines: Array<{ ts: string; text: string }> }
  | { type: 'stdout'; ts: string; text: string }
  | { type: 'event'; ts: string; label: string; tone: 'info' | 'warn' | 'error' | 'neutral'; text: string; detail?: string }
  | { type: 'diff_group'; ts: string; endTs?: string; filePath?: string; hunks: Array<{ changeType: 'add' | 'remove' | 'context' | 'hunk' | 'file_header' | 'truncation'; text: string }> }

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, Math.max(0, max - 1))}…` : value
}

function humanizeLabel(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function stripWrappedShell(command: string): string {
  const trimmed = compactWhitespace(command)
  const shellWrapped = trimmed.match(/^(?:(?:\/bin\/)?(?:zsh|bash|sh)|cmd(?:\.exe)?(?:\s+\/d)?(?:\s+\/s)?(?:\s+\/c)?)\s+(?:-lc|\/c)\s+(.+)$/i)
  const inner = shellWrapped?.[1] ?? trimmed
  const quoted = inner.match(/^(['"])([\s\S]*)\1$/)
  return compactWhitespace(quoted?.[2] ?? inner)
}

function formatUnknown(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}

function formatToolPayload(value: unknown): string {
  if (typeof value === 'string') {
    try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value }
  }
  return formatUnknown(value)
}

function extractToolUseId(input: unknown): string | undefined {
  const record = asRecord(input)
  if (!record) return undefined
  for (const candidate of [record.toolUseId, record.tool_use_id, record.callId, record.call_id, record.id]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }
  return undefined
}

function summarizeRecord(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return truncate(compactWhitespace(value), 120)
  }
  return null
}

function isCommandTool(name: string, input: unknown): boolean {
  if (['command_execution', 'shell', 'shellToolCall', 'bash'].includes(name)) return true
  if (typeof input === 'string') return /\b(?:bash|zsh|sh|cmd|powershell)\b/i.test(input)
  const record = asRecord(input)
  return Boolean(record && (typeof record.command === 'string' || typeof record.cmd === 'string'))
}

function displayToolName(name: string, input: unknown): string {
  if (isCommandTool(name, input)) return 'Executing command'
  return humanizeLabel(name)
}

function summarizeToolInput(name: string, input: unknown, density: TranscriptDensity): string {
  const compactMax = density === 'compact' ? 72 : 120
  if (typeof input === 'string') {
    const normalized = isCommandTool(name, input) ? stripWrappedShell(input) : compactWhitespace(input)
    return truncate(normalized, compactMax)
  }
  const record = asRecord(input)
  if (!record) return truncate(compactWhitespace(formatUnknown(input)) || `Inspect ${name} input`, compactMax)
  const command = typeof record.command === 'string' ? record.command : typeof record.cmd === 'string' ? record.cmd : null
  if (command && isCommandTool(name, record)) return truncate(stripWrappedShell(command), compactMax)
  const direct =
    summarizeRecord(record, ['command', 'cmd', 'path', 'filePath', 'file_path', 'query', 'url', 'prompt', 'message'])
    ?? summarizeRecord(record, ['pattern', 'name', 'title', 'target', 'tool'])
    ?? null
  if (direct) return truncate(direct, compactMax)
  if (Array.isArray(record.paths) && record.paths.length > 0) {
    const first = record.paths.find((v): v is string => typeof v === 'string' && v.trim().length > 0)
    if (first) return truncate(`${record.paths.length} paths, starting with ${first}`, compactMax)
  }
  const keys = Object.keys(record)
  if (keys.length === 0) return `No ${name} input`
  if (keys.length === 1) return truncate(`${keys[0]} payload`, compactMax)
  return truncate(`${keys.length} fields: ${keys.slice(0, 3).join(', ')}`, compactMax)
}

function parseStructuredToolResult(result: string | undefined) {
  if (!result) return null
  const lines = result.split(/\r?\n/)
  const metadata = new Map<string, string>()
  let bodyStartIndex = lines.findIndex((line) => line.trim() === '')
  if (bodyStartIndex === -1) bodyStartIndex = lines.length
  for (let i = 0; i < bodyStartIndex; i++) {
    const match = lines[i]?.match(/^([a-z_]+):\s*(.+)$/i)
    if (match) metadata.set(match[1].toLowerCase(), compactWhitespace(match[2]))
  }
  const body = lines.slice(Math.min(bodyStartIndex + 1, lines.length))
    .map((l) => compactWhitespace(l)).filter(Boolean).join('\n')
  return { command: metadata.get('command') ?? null, status: metadata.get('status') ?? null, exitCode: metadata.get('exit_code') ?? null, body }
}

function summarizeToolResult(result: string | undefined, isError: boolean | undefined, density: TranscriptDensity): string {
  if (!result) return isError ? 'Tool failed' : 'Waiting for result'
  const structured = parseStructuredToolResult(result)
  if (structured) {
    if (structured.body) return truncate(structured.body.split('\n')[0] ?? structured.body, density === 'compact' ? 84 : 140)
    if (structured.status === 'completed') return 'Completed'
    if (structured.status === 'failed' || structured.status === 'error') {
      return structured.exitCode ? `Failed with exit code ${structured.exitCode}` : 'Failed'
    }
  }
  const lines = result.split(/\r?\n/).map((l) => compactWhitespace(l)).filter(Boolean)
  return truncate(lines[0] ?? result, density === 'compact' ? 84 : 140)
}

function parseSystemActivity(text: string): { activityId?: string; name: string; status: 'running' | 'completed' } | null {
  const match = text.match(/^item (started|completed):\s*([a-z0-9_-]+)(?:\s+\(id=([^)]+)\))?$/i)
  if (!match) return null
  return {
    status: match[1].toLowerCase() === 'started' ? 'running' : 'completed',
    name: humanizeLabel(match[2] ?? 'Activity'),
    activityId: match[3] || undefined,
  }
}

function shouldHideNiceModeStderr(text: string): boolean {
  return compactWhitespace(text).toLowerCase().startsWith('[paperclip] skipping saved session resume')
}

function groupCommandBlocks(blocks: TranscriptBlock[]): TranscriptBlock[] {
  const grouped: TranscriptBlock[] = []
  let pending: Array<Extract<TranscriptBlock, { type: 'command_group' }>['items'][number]> = []
  let groupTs: string | null = null
  let groupEndTs: string | undefined

  const flush = () => {
    if (pending.length === 0 || !groupTs) return
    grouped.push({ type: 'command_group', ts: groupTs, endTs: groupEndTs, items: pending })
    pending = []
    groupTs = null
    groupEndTs = undefined
  }

  for (const block of blocks) {
    if (block.type === 'tool' && isCommandTool(block.name, block.input)) {
      if (!groupTs) groupTs = block.ts
      groupEndTs = block.endTs ?? block.ts
      pending.push({ ts: block.ts, endTs: block.endTs, input: block.input, result: block.result, isError: block.isError, status: block.status })
      continue
    }
    flush()
    grouped.push(block)
  }
  flush()
  return grouped
}

function groupToolBlocks(blocks: TranscriptBlock[]): TranscriptBlock[] {
  const grouped: TranscriptBlock[] = []
  let pending: Array<Extract<TranscriptBlock, { type: 'tool_group' }>['items'][number]> = []
  let groupTs: string | null = null
  let groupEndTs: string | undefined

  const flush = () => {
    if (pending.length === 0 || !groupTs) return
    grouped.push({ type: 'tool_group', ts: groupTs, endTs: groupEndTs, items: pending })
    pending = []
    groupTs = null
    groupEndTs = undefined
  }

  for (const block of blocks) {
    if (block.type === 'tool' && !isCommandTool(block.name, block.input)) {
      if (!groupTs) groupTs = block.ts
      groupEndTs = block.endTs ?? block.ts
      pending.push({ ts: block.ts, endTs: block.endTs, name: block.name, input: block.input, result: block.result, isError: block.isError, status: block.status })
      continue
    }
    flush()
    grouped.push(block)
  }
  flush()
  return grouped
}

export function normalizeTranscript(entries: TranscriptEntry[], streaming: boolean): TranscriptBlock[] {
  const blocks: TranscriptBlock[] = []
  const pendingToolBlocks = new Map<string, Extract<TranscriptBlock, { type: 'tool' }>>()
  const pendingActivityBlocks = new Map<string, Extract<TranscriptBlock, { type: 'activity' }>>()

  for (const entry of entries) {
    const previous = blocks[blocks.length - 1]

    if (entry.kind === 'assistant' || entry.kind === 'user') {
      const isStreaming = streaming && entry.kind === 'assistant' && entry.delta === true
      if (previous?.type === 'message' && previous.role === entry.kind) {
        previous.text += previous.text.endsWith('\n') || entry.text.startsWith('\n') ? entry.text : `\n${entry.text}`
        previous.ts = entry.ts
        previous.streaming = previous.streaming || isStreaming
      } else {
        blocks.push({ type: 'message', role: entry.kind, ts: entry.ts, text: entry.text, streaming: isStreaming })
      }
      continue
    }

    if (entry.kind === 'thinking') {
      const isStreaming = streaming && entry.delta === true
      if (previous?.type === 'thinking') {
        previous.text += previous.text.endsWith('\n') || entry.text.startsWith('\n') ? entry.text : `\n${entry.text}`
        previous.ts = entry.ts
        previous.streaming = previous.streaming || isStreaming
      } else {
        blocks.push({ type: 'thinking', ts: entry.ts, text: entry.text, streaming: isStreaming })
      }
      continue
    }

    if (entry.kind === 'tool_call') {
      const toolBlock: Extract<TranscriptBlock, { type: 'tool' }> = {
        type: 'tool', ts: entry.ts,
        name: displayToolName(entry.name, entry.input),
        toolUseId: entry.toolUseId ?? extractToolUseId(entry.input),
        input: entry.input, status: 'running',
      }
      blocks.push(toolBlock)
      if (toolBlock.toolUseId) pendingToolBlocks.set(toolBlock.toolUseId, toolBlock)
      continue
    }

    if (entry.kind === 'tool_result') {
      const matched =
        pendingToolBlocks.get(entry.toolUseId)
        ?? [...blocks].reverse().find((b): b is Extract<TranscriptBlock, { type: 'tool' }> => b.type === 'tool' && b.status === 'running')
      if (matched) {
        matched.result = entry.content
        matched.isError = entry.isError
        matched.status = entry.isError ? 'error' : 'completed'
        matched.endTs = entry.ts
        pendingToolBlocks.delete(entry.toolUseId)
      } else {
        blocks.push({ type: 'tool', ts: entry.ts, endTs: entry.ts, name: entry.toolName ?? 'tool', toolUseId: entry.toolUseId, input: null, result: entry.content, isError: entry.isError, status: entry.isError ? 'error' : 'completed' })
      }
      continue
    }

    if (entry.kind === 'init') {
      blocks.push({ type: 'event', ts: entry.ts, label: 'init', tone: 'info', text: `model ${entry.model}${entry.sessionId ? ` • session ${entry.sessionId}` : ''}` })
      continue
    }

    if (entry.kind === 'result') {
      blocks.push({
        type: 'event', ts: entry.ts, label: 'result',
        tone: entry.isError ? 'error' : 'info',
        text: entry.text.trim() || entry.errors[0] || (entry.isError ? 'Run failed' : 'Completed'),
        detail: !entry.isError && entry.text.trim().length > 0
          ? `${formatTokens(entry.inputTokens)} / ${formatTokens(entry.outputTokens)} / $${entry.costUsd.toFixed(6)}`
          : undefined,
      })
      continue
    }

    if (entry.kind === 'stderr') {
      if (shouldHideNiceModeStderr(entry.text)) continue
      const prev = blocks[blocks.length - 1]
      if (prev && prev.type === 'stderr_group') {
        prev.lines.push({ ts: entry.ts, text: entry.text })
        prev.endTs = entry.ts
      } else {
        blocks.push({ type: 'stderr_group', ts: entry.ts, endTs: entry.ts, lines: [{ ts: entry.ts, text: entry.text }] })
      }
      continue
    }

    if (entry.kind === 'system') {
      if (compactWhitespace(entry.text).toLowerCase() === 'turn started') continue
      const activity = parseSystemActivity(entry.text)
      if (activity) {
        const existing = activity.activityId ? pendingActivityBlocks.get(activity.activityId) : undefined
        if (existing) {
          existing.status = activity.status
          existing.ts = entry.ts
          if (activity.status === 'completed' && activity.activityId) pendingActivityBlocks.delete(activity.activityId)
        } else {
          const block: Extract<TranscriptBlock, { type: 'activity' }> = { type: 'activity', ts: entry.ts, activityId: activity.activityId, name: activity.name, status: activity.status }
          blocks.push(block)
          if (activity.status === 'running' && activity.activityId) pendingActivityBlocks.set(activity.activityId, block)
        }
        continue
      }
      const prev = blocks[blocks.length - 1]
      if (prev && prev.type === 'system_group') {
        prev.lines.push({ ts: entry.ts, text: entry.text })
        prev.endTs = entry.ts
      } else {
        blocks.push({ type: 'system_group', ts: entry.ts, endTs: entry.ts, lines: [{ ts: entry.ts, text: entry.text }] })
      }
      continue
    }

    if (entry.kind === 'diff') {
      const prev = blocks[blocks.length - 1]
      if (prev && prev.type === 'diff_group') {
        if (entry.changeType === 'file_header') prev.filePath = entry.text
        prev.hunks.push({ changeType: entry.changeType, text: entry.text })
        prev.endTs = entry.ts
      } else {
        blocks.push({ type: 'diff_group', ts: entry.ts, endTs: entry.ts, filePath: entry.changeType === 'file_header' ? entry.text : undefined, hunks: [{ changeType: entry.changeType, text: entry.text }] })
      }
      continue
    }

    if (previous?.type === 'stdout') {
      previous.text += previous.text.endsWith('\n') || entry.text.startsWith('\n') ? entry.text : `\n${entry.text}`
      previous.ts = entry.ts
    } else {
      blocks.push({ type: 'stdout', ts: entry.ts, text: entry.text })
    }
  }

  return groupToolBlocks(groupCommandBlocks(blocks))
}

// ---------------------------------------------------------------------------
// Block renderers
// ---------------------------------------------------------------------------

function hasSelectedText() {
  if (typeof window === 'undefined') return false
  return (window.getSelection()?.toString().length ?? 0) > 0
}

function TranscriptMessageBlock({ block, density }: { block: Extract<TranscriptBlock, { type: 'message' }>; density: TranscriptDensity }) {
  const isAssistant = block.role === 'assistant'
  const compact = density === 'compact'
  return (
    <div>
      {!isAssistant && (
        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-quaternary">
          <User01 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          <span>User</span>
        </div>
      )}
      <MarkdownBody
        content={block.text}
        className={cx('[&>*:first-child]:mt-0 [&>*:last-child]:mb-0', compact ? 'text-xs leading-5' : 'text-sm')}
      />
      {block.streaming && (
        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium italic text-quaternary">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
          </span>
          Streaming
        </div>
      )}
    </div>
  )
}

function TranscriptThinkingBlock({ block, density, className }: { block: Extract<TranscriptBlock, { type: 'thinking' }>; density: TranscriptDensity; className?: string }) {
  const [open, setOpen] = useState(false)
  const compact = density === 'compact'
  const preview = block.text.slice(0, 100) + (block.text.length > 100 ? '…' : '')

  return (
    <div className={cx('rounded-lg border border-secondary bg-secondary/30', compact ? 'px-2.5 py-2' : 'px-3 py-2.5', className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        {/* Spinner when streaming, chevron when done */}
        {block.streaming ? (
          <span
            className={cx(
              'shrink-0 animate-spin rounded-full border-2 border-secondary',
              compact ? 'h-3 w-3' : 'h-3.5 w-3.5',
            )}
            style={{ borderTopColor: 'var(--color-fg-brand-primary)' }}
          />
        ) : (
          open
            ? <ChevronDown className="h-3 w-3 shrink-0 text-fg-quaternary" />
            : <ChevronRight className="h-3 w-3 shrink-0 text-fg-quaternary" />
        )}
        <span className={cx(
          'font-semibold uppercase tracking-[0.14em]',
          block.streaming ? 'shimmer-text text-brand-secondary' : 'text-quaternary',
          compact ? 'text-[10px]' : 'text-[11px]',
        )}>
          {block.streaming ? 'Thinking…' : open ? 'Thinking (hide)' : 'Thinking'}
        </span>
        {!open && !block.streaming && (
          <span className={cx('flex-1 truncate italic text-quaternary', compact ? 'text-[11px]' : 'text-xs')}>
            {preview}
          </span>
        )}
      </button>

      {/* Expanded content */}
      {open && !block.streaming && (
        <div className="mt-2 border-t border-secondary pt-2 pl-4">
          <MarkdownBody
            content={block.text}
            className={cx(
              'italic text-tertiary [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
              compact ? 'text-[11px] leading-5' : 'text-sm leading-6',
            )}
          />
        </div>
      )}
    </div>
  )
}

function TranscriptToolCard({ block, density }: { block: Extract<TranscriptBlock, { type: 'tool' }>; density: TranscriptDensity }) {
  const [open, setOpen] = useState(block.status === 'error')
  const compact = density === 'compact'
  const parsedResult = parseStructuredToolResult(block.result)
  const statusLabel = block.status === 'running' ? 'Running' : block.status === 'error' ? 'Errored' : 'Completed'
  const statusTone =
    block.status === 'running' ? 'text-brand-secondary'
    : block.status === 'error' ? 'text-error-primary'
    : 'text-success-primary'
  const detailsClass = cx('space-y-3', block.status === 'error' && 'rounded-xl border border-utility-error-200 dark:border-utility-error-800 bg-utility-error-50 dark:bg-utility-error-950 p-3')
  const iconClass = cx(
    'mt-0.5 h-3.5 w-3.5 shrink-0',
    block.status === 'error' ? 'text-error-primary'
    : block.status === 'completed' ? 'text-success-primary'
    : 'text-brand-secondary',
  )
  const summary = block.status === 'running'
    ? summarizeToolInput(block.name, block.input, density)
    : block.status === 'completed' && parsedResult?.body
      ? truncate(parsedResult.body.split('\n')[0] ?? parsedResult.body, compact ? 84 : 140)
      : summarizeToolResult(block.result, block.isError, density)

  return (
    <div className={cx(block.status === 'error' && 'rounded-xl border border-utility-error-200 dark:border-utility-error-800 bg-utility-error-50 dark:bg-utility-error-950 p-3')}>
      <div className="flex items-start gap-2">
        {block.status === 'error' ? <AlertCircle className={iconClass} /> : block.status === 'completed' ? <Check className={iconClass} /> : <Tool01 className={iconClass} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-quaternary">{block.name}</span>
            <span className={cx('text-[10px] font-semibold uppercase tracking-[0.14em]', statusTone)}>{statusLabel}</span>
          </div>
          <div className={cx('mt-1 break-words', compact ? 'text-xs' : 'text-sm')}>
            {block.status === 'running' ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-solid opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-solid" />
                </span>
                <span className="text-brand-secondary">{summary}</span>
              </span>
            ) : (
              <span className="text-secondary">{summary}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="mt-0.5 inline-flex h-5 w-5 items-center justify-center text-fg-tertiary transition-colors hover:text-fg-primary"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Collapse tool details' : 'Expand tool details'}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
      {open && (
        <div className="mt-3">
          <div className={detailsClass}>
            <div className={cx('grid gap-3', compact ? 'grid-cols-1' : 'lg:grid-cols-2')}>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-quaternary">Input</div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-secondary">
                  {formatToolPayload(block.input) || '<empty>'}
                </pre>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-quaternary">Result</div>
                <pre className={cx('overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px]', block.status === 'error' ? 'text-error-primary' : 'text-secondary')}>
                  {block.result ? formatToolPayload(block.result) : 'Waiting for result...'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TranscriptCommandGroup({ block, density }: { block: Extract<TranscriptBlock, { type: 'command_group' }>; density: TranscriptDensity }) {
  const [open, setOpen] = useState(false)
  const compact = density === 'compact'
  const runningItem = [...block.items].reverse().find((item) => item.status === 'running')
  const latestItem = block.items[block.items.length - 1] ?? null
  const hasError = block.items.some((item) => item.status === 'error')
  const isRunning = Boolean(runningItem)
  const showExpandedErrorState = open && hasError
  const title = isRunning ? 'Executing command' : block.items.length === 1 ? 'Executed command' : `Executed ${block.items.length} commands`
  const subtitle = runningItem ? summarizeToolInput('command_execution', runningItem.input, density) : null

  return (
    <div className={cx(showExpandedErrorState && 'rounded-xl border border-utility-error-200 dark:border-utility-error-800 bg-utility-error-50 dark:bg-utility-error-950 p-3')}>
      <div
        role="button"
        tabIndex={0}
        className={cx('flex cursor-pointer gap-2', subtitle ? 'items-start' : 'items-center')}
        onClick={() => { if (hasSelectedText()) return; setOpen((v) => !v) }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v) } }}
      >
        <div className={cx('flex shrink-0 items-center', subtitle && 'mt-0.5')}>
          {block.items.slice(0, Math.min(block.items.length, 3)).map((_, index) => (
            <span
              key={index}
              className={cx(
                'inline-flex h-6 w-6 items-center justify-center rounded-full border shadow-sm',
                index > 0 && '-ml-1.5',
                isRunning
                  ? 'border-secondary bg-secondary text-brand-secondary'
                  : 'border-secondary bg-primary text-quaternary',
                isRunning && 'animate-pulse',
              )}
            >
              <TerminalSquare className="h-3.5 w-3.5" />
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase leading-none tracking-[0.1em] text-quaternary">{title}</div>
          {subtitle && (
            <div className={cx('mt-1 break-words font-mono text-primary', compact ? 'text-xs' : 'text-sm')}>{subtitle}</div>
          )}
          {!subtitle && latestItem?.status === 'error' && open && (
            <div className={cx('mt-1 text-error-primary', compact ? 'text-xs' : 'text-sm')}>Command failed</div>
          )}
        </div>
        <button
          type="button"
          className={cx('inline-flex h-5 w-5 items-center justify-center text-fg-tertiary transition-colors hover:text-fg-primary', subtitle && 'mt-0.5')}
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
          aria-label={open ? 'Collapse command details' : 'Expand command details'}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
      {open && (
        <div className={cx('mt-3 space-y-3', hasError && 'rounded-xl border border-utility-error-200 dark:border-utility-error-800 bg-utility-error-50 dark:bg-utility-error-950 p-3')}>
          {block.items.map((item, index) => (
            <div key={`${item.ts}-${index}`} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={cx(
                  'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                  item.status === 'error' ? 'border-utility-error-200 dark:border-utility-error-800 bg-utility-error-50 dark:bg-utility-error-950 text-error-primary'
                  : item.status === 'running' ? 'border-secondary bg-secondary text-brand-secondary'
                  : 'border-secondary bg-primary text-quaternary',
                )}>
                  <TerminalSquare className="h-3 w-3" />
                </span>
                <span className={cx('font-mono break-all', compact ? 'text-[11px]' : 'text-xs')}>
                  {summarizeToolInput('command_execution', item.input, density)}
                </span>
              </div>
              {item.result && (
                <pre className={cx('overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px]', item.status === 'error' ? 'text-error-primary' : 'text-secondary')}>
                  {formatToolPayload(item.result)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TranscriptToolGroup({ block, density }: { block: Extract<TranscriptBlock, { type: 'tool_group' }>; density: TranscriptDensity }) {
  const [open, setOpen] = useState(false)
  const compact = density === 'compact'
  const runningItem = [...block.items].reverse().find((item) => item.status === 'running')
  const hasError = block.items.some((item) => item.status === 'error')
  const isRunning = Boolean(runningItem)
  const uniqueNames = [...new Set(block.items.map((item) => item.name))]
  const toolLabel = uniqueNames.length === 1 ? humanizeLabel(uniqueNames[0]) : `${uniqueNames.length} tools`
  const title = isRunning ? `Using ${toolLabel}` : block.items.length === 1 ? `Used ${toolLabel}` : `Used ${toolLabel} (${block.items.length} calls)`
  const subtitle = runningItem ? summarizeToolInput(runningItem.name, runningItem.input, density) : null

  return (
    <div className="rounded-xl border border-secondary bg-secondary/25">
      <div
        role="button"
        tabIndex={0}
        className={cx('flex cursor-pointer gap-2 px-3 py-2.5', subtitle ? 'items-start' : 'items-center')}
        onClick={() => { if (hasSelectedText()) return; setOpen((v) => !v) }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v) } }}
      >
        <div className={cx('flex shrink-0 items-center', subtitle && 'mt-0.5')}>
          {block.items.slice(0, Math.min(block.items.length, 3)).map((item, index) => {
            const isItemRunning = item.status === 'running'
            const isItemError = item.status === 'error'
            return (
              <span
                key={`${item.ts}-${index}`}
                className={cx(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full border shadow-sm',
                  index > 0 && '-ml-1.5',
                  isItemRunning ? 'border-secondary bg-secondary text-brand-secondary'
                  : isItemError ? 'border-utility-error-200 dark:border-utility-error-800 bg-utility-error-50 dark:bg-utility-error-950 text-error-primary'
                  : 'border-secondary bg-primary text-quaternary',
                  isItemRunning && 'animate-pulse',
                )}
              >
                <Tool01 className="h-3.5 w-3.5" />
              </span>
            )
          })}
        </div>
        <div className="min-w-0 flex-1">
          <div className={cx('font-semibold uppercase leading-none tracking-[0.1em] text-quaternary', compact ? 'text-[10px]' : 'text-[11px]')}>{title}</div>
          {subtitle && <div className={cx('mt-1 break-words font-mono text-primary', compact ? 'text-xs' : 'text-sm')}>{subtitle}</div>}
        </div>
        <button
          type="button"
          className={cx('inline-flex h-5 w-5 items-center justify-center text-fg-tertiary transition-colors hover:text-fg-primary', subtitle && 'mt-0.5')}
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
          aria-label={open ? 'Collapse tool details' : 'Expand tool details'}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
      {open && (
        <div className={cx('space-y-2 border-t border-secondary px-3 py-3', hasError && 'rounded-b-xl')}>
          {block.items.map((item, index) => (
            <div key={`${item.ts}-${index}`} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={cx(
                  'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                  item.status === 'error' ? 'border-utility-error-200 dark:border-utility-error-800 bg-utility-error-50 dark:bg-utility-error-950 text-error-primary'
                  : item.status === 'running' ? 'border-secondary bg-secondary text-brand-secondary'
                  : 'border-secondary bg-primary text-quaternary',
                )}>
                  <Tool01 className="h-3 w-3" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-quaternary">{humanizeLabel(item.name)}</span>
                <span className={cx('text-[10px] font-semibold uppercase tracking-[0.14em]',
                  item.status === 'running' ? 'text-brand-secondary'
                  : item.status === 'error' ? 'text-error-primary'
                  : 'text-success-primary',
                )}>
                  {item.status === 'running' ? 'Running' : item.status === 'error' ? 'Errored' : 'Completed'}
                </span>
              </div>
              <div className={cx('grid gap-2 pl-7', compact ? 'grid-cols-1' : 'lg:grid-cols-2')}>
                <div>
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-quaternary">Input</div>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-secondary">{formatToolPayload(item.input) || '<empty>'}</pre>
                </div>
                {item.result && (
                  <div>
                    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-quaternary">Result</div>
                    <pre className={cx('overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px]', item.status === 'error' ? 'text-error-primary' : 'text-secondary')}>
                      {formatToolPayload(item.result)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TranscriptActivityRow({ block, density }: { block: Extract<TranscriptBlock, { type: 'activity' }>; density: TranscriptDensity }) {
  const compact = density === 'compact'
  return (
    <div className="flex items-center gap-2.5">
      {block.status === 'completed' ? (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-utility-success-200 dark:border-utility-success-800 bg-utility-success-50 dark:bg-utility-success-950">
          <Check className="h-3 w-3 text-success-primary" />
        </span>
      ) : (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-secondary bg-secondary animate-pulse">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-solid opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-solid" />
          </span>
        </span>
      )}
      <div className={cx(
        'break-words',
        block.status === 'completed' ? 'text-secondary' : 'text-brand-secondary',
        compact ? 'text-xs leading-5' : 'text-sm leading-6',
      )}>
        {block.name}
      </div>
    </div>
  )
}

function TranscriptEventRow({ block, density }: { block: Extract<TranscriptBlock, { type: 'event' }>; density: TranscriptDensity }) {
  const compact = density === 'compact'
  const toneClasses =
    block.tone === 'error' ? 'rounded-xl border border-utility-error-200 dark:border-utility-error-800 bg-utility-error-50 dark:bg-utility-error-950 p-3 text-error-primary'
    : block.tone === 'warn' ? 'text-warning-primary'
    : block.tone === 'info' ? 'text-brand-secondary'
    : 'text-tertiary'

  return (
    <div className={toneClasses}>
      <div className="flex items-start gap-2">
        {block.tone === 'error' ? (
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : block.tone === 'warn' ? (
          <TerminalSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : (
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current/50" />
        )}
        <div className="min-w-0 flex-1">
          {block.label === 'result' && block.tone !== 'error' ? (
            <MarkdownBody
              content={block.text}
              className={cx('[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-brand-secondary', compact ? 'text-[11px] leading-5' : 'text-xs leading-5')}
            />
          ) : (
            <div className={cx('whitespace-pre-wrap break-words', compact ? 'text-[11px]' : 'text-xs')}>
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-quaternary">{block.label}</span>
              {block.text ? <span className="ml-2">{block.text}</span> : null}
            </div>
          )}
          {block.detail && (
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-tertiary">{block.detail}</pre>
          )}
        </div>
      </div>
    </div>
  )
}

function TranscriptDiffGroup({ block, density }: { block: Extract<TranscriptBlock, { type: 'diff_group' }>; density: TranscriptDensity }) {
  const [open, setOpen] = useState(false)
  const compact = density === 'compact'
  const addCount = block.hunks.filter((h) => h.changeType === 'add').length
  const removeCount = block.hunks.filter((h) => h.changeType === 'remove').length
  const hasChanges = addCount > 0 || removeCount > 0
  const shortFile = block.filePath ? block.filePath.split('/').pop() ?? block.filePath : 'diff'

  return (
    <div className="rounded-xl border border-primary bg-primary p-2">
      <div
        role="button"
        tabIndex={0}
        className="flex cursor-pointer items-center gap-2"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v) } }}
      >
        <GitBranch01 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-secondary">{shortFile}</span>
        {hasChanges && (
          <span className="text-[10px] tabular-nums">
            <span className="text-success-primary">+{addCount}</span>{' '}
            <span className="text-error-primary">-{removeCount}</span>
          </span>
        )}
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </div>
      {open && (
        <pre className={cx('mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono pl-5', compact ? 'text-[11px]' : 'text-xs')}>
          {block.hunks.map((hunk, i) => {
            const key = `${i}-${hunk.changeType}`
            switch (hunk.changeType) {
              case 'remove': return <span key={key} className="block bg-utility-error-100 dark:bg-utility-error-900 text-error-primary -mx-2 px-2"><span className="select-none mr-2 text-utility-error-400">-</span>{hunk.text}{'\n'}</span>
              case 'add': return <span key={key} className="block bg-utility-success-100 dark:bg-utility-success-900 text-success-primary -mx-2 px-2"><span className="select-none mr-2 text-utility-success-400">+</span>{hunk.text}{'\n'}</span>
              case 'file_header': return <span key={key} className="block font-semibold text-brand-secondary mt-2 first:mt-0">{hunk.text}{'\n'}</span>
              case 'truncation': return <span key={key} className="block text-quaternary italic mt-1">{hunk.text}{'\n'}</span>
              default: return <span key={key} className="block text-quaternary"> {hunk.text}{'\n'}</span>
            }
          })}
        </pre>
      )}
    </div>
  )
}

function TranscriptStderrGroup({ block, density }: { block: Extract<TranscriptBlock, { type: 'stderr_group' }>; density: TranscriptDensity }) {
  const [open, setOpen] = useState(false)
  const compact = density === 'compact'
  return (
    <div className="rounded-xl border border-utility-warning-200 dark:border-utility-warning-800 bg-utility-warning-50 dark:bg-utility-warning-950 p-2 text-warning-primary">
      <div role="button" tabIndex={0} className="flex cursor-pointer items-center gap-2"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v) } }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{block.lines.length} log {block.lines.length === 1 ? 'line' : 'lines'}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </div>
      {open && (
        <pre className={cx('mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-warning-primary pl-5', compact ? 'text-[10px]' : 'text-[11px]')}>
          {block.lines.map((line, i) => <span key={`${line.ts}-${i}`}><span className="select-none text-utility-warning-400">{i > 0 ? '\n' : ''}</span>{line.text}</span>)}
        </pre>
      )}
    </div>
  )
}

function TranscriptSystemGroup({ block }: { block: Extract<TranscriptBlock, { type: 'system_group' }>; density: TranscriptDensity }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-primary bg-primary p-2 text-brand-secondary">
      <div role="button" tabIndex={0} className="flex cursor-pointer items-center gap-2"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v) } }}
      >
        <TerminalSquare className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{block.lines.length} system {block.lines.length === 1 ? 'message' : 'messages'}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </div>
      {open && (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-brand-secondary pl-5">
          {block.lines.map((line, i) => <span key={`${line.ts}-${i}`}><span className="select-none text-quaternary">{i > 0 ? '\n' : ''}</span>{line.text}</span>)}
        </pre>
      )}
    </div>
  )
}

function TranscriptStdoutRow({ block, density, collapseByDefault }: { block: Extract<TranscriptBlock, { type: 'stdout' }>; density: TranscriptDensity; collapseByDefault: boolean }) {
  const [open, setOpen] = useState(!collapseByDefault)
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-quaternary">stdout</span>
        <button type="button" className="inline-flex h-5 w-5 items-center justify-center text-fg-tertiary transition-colors hover:text-fg-primary" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Collapse stdout' : 'Expand stdout'}>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
      {open && (
        <pre className={cx('mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-secondary', density === 'compact' ? 'text-[11px]' : 'text-xs')}>
          {block.text}
        </pre>
      )}
    </div>
  )
}

function RawTranscriptView({ entries, density }: { entries: TranscriptEntry[]; density: TranscriptDensity }) {
  const compact = density === 'compact'
  return (
    <div className={cx('font-mono', compact ? 'space-y-1 text-[11px]' : 'space-y-1.5 text-xs')}>
      {entries.map((entry, idx) => (
        <div key={`${entry.kind}-${entry.ts}-${idx}`} className="grid gap-x-3 grid-cols-[auto_1fr]">
          <span className="text-[10px] uppercase tracking-[0.18em] text-quaternary">{entry.kind}</span>
          <pre className="min-w-0 whitespace-pre-wrap break-words text-secondary">
            {entry.kind === 'tool_call'
              ? `${entry.name}\n${formatToolPayload(entry.input)}`
              : entry.kind === 'tool_result'
                ? formatToolPayload(entry.content)
                : entry.kind === 'result'
                  ? `${entry.text}\n${formatTokens(entry.inputTokens)} / ${formatTokens(entry.outputTokens)} / $${entry.costUsd.toFixed(6)}`
                  : entry.kind === 'init'
                    ? `model=${entry.model}${entry.sessionId ? ` session=${entry.sessionId}` : ''}`
                    : entry.text}
          </pre>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RunTranscriptView — main export
// ---------------------------------------------------------------------------

export function RunTranscriptView({
  entries,
  mode = 'nice',
  density = 'comfortable',
  limit,
  streaming = false,
  collapseStdout = false,
  emptyMessage = 'No transcript yet.',
  className,
  thinkingClassName,
}: RunTranscriptViewProps) {
  const blocks = useMemo(() => normalizeTranscript(entries, streaming), [entries, streaming])
  const visibleBlocks = limit ? blocks.slice(-limit) : blocks
  const visibleEntries = limit ? entries.slice(-limit) : entries

  if (entries.length === 0) {
    return (
      <div className={cx('rounded-2xl border border-dashed border-secondary bg-primary/40 p-4 text-sm text-tertiary', className)}>
        {emptyMessage}
      </div>
    )
  }

  if (mode === 'raw') {
    return (
      <div className={className}>
        <RawTranscriptView entries={visibleEntries} density={density} />
      </div>
    )
  }

  return (
    <div className={cx('space-y-3', className)}>
      {visibleBlocks.map((block, index) => (
        <div
          key={`${block.type}-${block.ts}-${index}`}
          className={cx(index === visibleBlocks.length - 1 && streaming && 'animate-in fade-in slide-in-from-bottom-1 duration-300')}
        >
          {block.type === 'message' && <TranscriptMessageBlock block={block} density={density} />}
          {block.type === 'thinking' && <TranscriptThinkingBlock block={block} density={density} className={thinkingClassName} />}
          {block.type === 'tool' && <TranscriptToolCard block={block} density={density} />}
          {block.type === 'command_group' && <TranscriptCommandGroup block={block} density={density} />}
          {block.type === 'tool_group' && <TranscriptToolGroup block={block} density={density} />}
          {block.type === 'diff_group' && <TranscriptDiffGroup block={block} density={density} />}
          {block.type === 'stderr_group' && <TranscriptStderrGroup block={block} density={density} />}
          {block.type === 'system_group' && <TranscriptSystemGroup block={block} density={density} />}
          {block.type === 'stdout' && <TranscriptStdoutRow block={block} density={density} collapseByDefault={collapseStdout} />}
          {block.type === 'activity' && <TranscriptActivityRow block={block} density={density} />}
          {block.type === 'event' && <TranscriptEventRow block={block} density={density} />}
        </div>
      ))}
    </div>
  )
}
