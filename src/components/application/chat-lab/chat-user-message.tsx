'use client'

import { useState } from 'react'
import { BadgeWithDot, Button, Tooltip, TooltipTrigger, cx, useClipboard } from '@circos/ui'
import { Copy06, Check, XClose } from '@untitledui/icons'
import type { ChatUserMessageData } from './types'

interface ChatUserMessageProps {
  data: ChatUserMessageData
  onInterrupt?: (runId: string) => void
}

export function ChatUserMessage({ data, onInterrupt }: ChatUserMessageProps) {
  const { copy, copied } = useClipboard()
  const isQueued = data.status === 'queued'
  const isPending = data.status === 'pending'

  return (
    <div className="group flex items-start justify-end gap-2.5">
      <div className="flex min-w-0 max-w-[85%] flex-col items-end">
        <div
          className={cx(
            'min-w-0 break-words rounded-2xl bg-secondary px-4 py-2.5',
            isPending && 'opacity-60',
          )}
        >
          {isQueued && (
            <div className="mb-2 flex items-center gap-2">
              <BadgeWithDot size="sm" color="warning" type="pill-color">
                Queued
              </BadgeWithDot>
              {data.queueTargetRunId && onInterrupt && (
                <Button
                  size="sm"
                  color="secondary-destructive"
                  iconLeading={XClose}
                  onClick={() => onInterrupt(data.queueTargetRunId!)}
                >
                  Interrupt
                </Button>
              )}
            </div>
          )}
          <p className="text-sm leading-6 text-primary">{data.body}</p>
        </div>

        {isPending ? (
          <span className="mt-1 text-[11px] text-quaternary">Sending...</span>
        ) : (
          <div className="mt-1 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Tooltip title={new Date(data.createdAt).toLocaleString('en-US')}>
              <TooltipTrigger>
                <span className="cursor-default text-[11px] text-quaternary">
                  {formatShort(data.createdAt)}
                </span>
              </TooltipTrigger>
            </Tooltip>
            <button
              type="button"
              onClick={() => copy(data.body)}
              className="inline-flex size-6 items-center justify-center rounded-md text-quaternary transition-colors hover:bg-secondary hover:text-secondary"
              title="Copy message"
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy06 className="size-3.5" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function formatShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
