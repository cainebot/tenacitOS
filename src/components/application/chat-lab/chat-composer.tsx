'use client'

import { Button, cx } from '@circos/ui'
import { Send03, AlertTriangle } from '@untitledui/icons'

interface ChatComposerProps {
  disabled?: boolean
  disabledReason?: string
}

export function ChatComposer({ disabled, disabledReason }: ChatComposerProps) {
  if (disabledReason) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-secondary bg-secondary/30 px-4 py-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-tertiary" />
        <p className="text-sm text-tertiary">{disabledReason}</p>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-3 rounded-xl border border-secondary bg-primary/60 px-4 py-3">
      <textarea
        className="min-h-[40px] flex-1 resize-none bg-transparent text-sm text-primary placeholder:text-placeholder focus:outline-none"
        placeholder="Reply..."
        rows={1}
        disabled={disabled}
      />
      <Button size="sm" color="primary" iconLeading={Send03} isDisabled={disabled}>
        Send
      </Button>
    </div>
  )
}
