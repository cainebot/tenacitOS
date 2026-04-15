'use client'

import { Avatar, BadgeWithDot, Tooltip, TooltipTrigger, cx, useClipboard } from '@circos/ui'
import { Copy06, Check, ThumbsUp, ThumbsDown } from '@untitledui/icons'
import { MarkdownBody } from '../markdown-body'
import { ChatChainOfThought } from './chat-chain-of-thought'
import type { ChatAssistantMessageData } from './types'

interface ChatAssistantMessageProps {
  data: ChatAssistantMessageData
}

export function ChatAssistantMessage({ data }: ChatAssistantMessageProps) {
  const { copy, copied } = useClipboard()

  return (
    <div className="group flex items-start gap-2.5 py-1.5">
      <Avatar size="sm" initials={data.authorInitials} />

      <div className="min-w-0 flex-1">
        {/* Header: name + running badge */}
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-sm font-medium text-primary">
            {data.authorName}
          </span>
          {data.isRunning && (
            <BadgeWithDot size="sm" color="brand" type="pill-color">
              Running
            </BadgeWithDot>
          )}
        </div>

        {/* Body — wrapped in bubble matching user messages */}
        {data.body && (
          <div className="min-w-0 break-words rounded-2xl bg-secondary px-4 py-2.5">
            <MarkdownBody content={data.body} />
          </div>
        )}

        {/* Waiting state — no body yet, run is active */}
        {!data.body && data.isRunning && (
          <div className="min-w-0 rounded-2xl bg-secondary px-4 py-2.5">
            <p className="text-sm italic text-quaternary">Thinking...</p>
          </div>
        )}

        {/* Chain of thought */}
        {data.chainOfThought && (
          <ChatChainOfThought data={data.chainOfThought} />
        )}

        {/* Notices */}
        {data.notices && data.notices.length > 0 && (
          <div className="mt-2 space-y-1">
            {data.notices.map((notice, i) => (
              <div
                key={i}
                className="rounded-lg border border-secondary bg-secondary/30 px-3 py-2 text-xs text-tertiary"
              >
                {notice}
              </div>
            ))}
          </div>
        )}

        {/* Action bar — shown on hover (or always for voted feedback) */}
        {!data.isRunning && data.body && (
          <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {/* Copy button */}
            <button
              type="button"
              onClick={() => copy(data.body)}
              className="inline-flex size-7 items-center justify-center rounded-md text-quaternary transition-colors hover:bg-secondary hover:text-secondary"
              title="Copy message"
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy06 className="size-3.5" />
              )}
            </button>

            {/* Feedback thumbs (visual only) */}
            {data.feedbackVote !== undefined && (
              <>
                <button
                  type="button"
                  className={cx(
                    'inline-flex size-7 items-center justify-center rounded-md transition-colors',
                    data.feedbackVote === 'up'
                      ? 'text-success-primary opacity-100'
                      : 'text-quaternary hover:bg-secondary hover:text-secondary',
                  )}
                  title="Helpful"
                >
                  <ThumbsUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  className={cx(
                    'inline-flex size-7 items-center justify-center rounded-md transition-colors',
                    data.feedbackVote === 'down'
                      ? 'text-warning-primary opacity-100'
                      : 'text-quaternary hover:bg-secondary hover:text-secondary',
                  )}
                  title="Could be better"
                >
                  <ThumbsDown className="size-3.5" />
                </button>
              </>
            )}

            {/* Timestamp */}
            <Tooltip
              title={new Date(data.createdAt).toLocaleString('en-US')}
            >
              <TooltipTrigger>
                <span className="ml-1 cursor-default text-[11px] text-quaternary">
                  {new Date(data.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </TooltipTrigger>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  )
}
