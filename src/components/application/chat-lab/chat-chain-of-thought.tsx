'use client'

import { useEffect, useRef, useState } from 'react'
import { cx } from '@circos/ui'
import { ChevronDown } from '@untitledui/icons'
import { Brain, Loader2 } from 'lucide-react'
import { TranscriptToolCard } from '../run-transcript-view'
import type { ChatChainOfThoughtData } from './types'

interface ChatChainOfThoughtProps {
  data: ChatChainOfThoughtData
}

export function ChatChainOfThought({ data }: ChatChainOfThoughtProps) {
  const [expanded, setExpanded] = useState(data.isActive)
  const hasContent = data.reasoningLines.length > 0 || data.tools.length > 0

  const durationLabel = data.durationMs
    ? formatDuration(data.durationMs)
    : undefined

  const headerVerb = data.isActive ? 'Working' : 'Worked'
  const toolSummary =
    data.tools.length > 0
      ? `${data.tools.length} tool${data.tools.length > 1 ? 's' : ''}`
      : null

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => hasContent && setExpanded((v) => !v)}
        className={cx(
          'flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors',
          hasContent && 'hover:bg-secondary/50',
        )}
      >
        {data.isActive ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-quaternary" />
        ) : (
          <span className="flex size-4 shrink-0 items-center justify-center">
            <span className="size-1.5 rounded-full bg-success-solid/70" />
          </span>
        )}
        <span
          className={cx(
            'text-sm font-medium text-secondary',
            data.isActive && 'shimmer-text',
          )}
        >
          {headerVerb}
        </span>
        {durationLabel && (
          <span className="text-xs text-quaternary">por {durationLabel}</span>
        )}
        {toolSummary && (
          <span className="text-xs text-quaternary">· {toolSummary}</span>
        )}
        {hasContent && (
          <ChevronDown
            className={cx(
              'ml-auto size-4 text-quaternary transition-transform',
              expanded && 'rotate-180',
            )}
          />
        )}
      </button>

      {expanded && hasContent && (
        <div className="mt-1 space-y-2 pl-6">
          {data.isActive && data.reasoningLines.length > 0 && (
            <ReasoningTicker lines={data.reasoningLines} />
          )}

          {!data.isActive && data.reasoningLines.length > 0 && (
            <div className="flex gap-2 px-1">
              <Brain className="mt-0.5 size-3.5 shrink-0 text-quaternary" />
              <p className="text-[13px] italic leading-5 text-quaternary">
                {data.reasoningLines[data.reasoningLines.length - 1]}
              </p>
            </div>
          )}

          {data.tools.map((tool) => (
            <TranscriptToolCard
              key={tool.id}
              toolName={tool.toolName}
              input={tool.input}
              output={tool.output}
              status={tool.status}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ReasoningTicker — animated line-by-line display (same pattern as page hero)
// ---------------------------------------------------------------------------

function ReasoningTicker({
  lines,
  intervalMs = 2200,
}: {
  lines: string[]
  intervalMs?: number
}) {
  const [index, setIndex] = useState(0)
  const prevRef = useRef(lines[0])
  const [ticker, setTicker] = useState<{
    key: number
    current: string
    exiting: string | null
  }>({ key: 0, current: lines[0], exiting: null })

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % lines.length)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs, lines.length])

  const currentLine = lines[index]

  useEffect(() => {
    if (currentLine !== prevRef.current) {
      const prev = prevRef.current
      prevRef.current = currentLine
      setTicker((t) => ({ key: t.key + 1, current: currentLine, exiting: prev }))
    }
  }, [currentLine])

  return (
    <div className="flex gap-2 px-1">
      <Brain className="mt-0.5 size-3.5 shrink-0 text-quaternary" />
      <div className="relative h-5 min-w-0 flex-1 overflow-hidden">
        {ticker.exiting !== null && (
          <span
            key={`out-${ticker.key}`}
            className="cot-line-exit absolute inset-x-0 truncate text-[13px] italic leading-5 text-quaternary"
            onAnimationEnd={() =>
              setTicker((t) => ({ ...t, exiting: null }))
            }
          >
            {ticker.exiting}
          </span>
        )}
        <span
          key={`in-${ticker.key}`}
          className={cx(
            'absolute inset-x-0 truncate text-[13px] italic leading-5 text-quaternary',
            ticker.key > 0 && 'cot-line-enter',
          )}
        >
          {ticker.current}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Duration formatter
// ---------------------------------------------------------------------------

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return rem > 0 ? `${mins} min ${rem}s` : `${mins} min`
}
