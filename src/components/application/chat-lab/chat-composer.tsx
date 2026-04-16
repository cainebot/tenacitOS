'use client'

import { useRef, useState } from 'react'
import { Button, cx } from '@circos/ui'
import { Send03, AlertTriangle } from '@untitledui/icons'

interface ChatComposerProps {
  disabled?: boolean
  disabledReason?: string
  /** Phase 89.2 — callback when user submits a message */
  onSend?: (text: string) => void
}

export function ChatComposer({ disabled, disabledReason, onSend }: ChatComposerProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  if (disabledReason) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-secondary bg-secondary/30 px-4 py-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-tertiary" />
        <p className="text-sm text-tertiary">{disabledReason}</p>
      </div>
    )
  }

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend?.(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  return (
    <div className="flex items-end gap-3 rounded-xl border border-secondary bg-primary/60 px-4 py-3">
      <textarea
        ref={textareaRef}
        className="min-h-[40px] flex-1 resize-none bg-transparent text-sm text-primary placeholder:text-placeholder focus:outline-none"
        placeholder="Reply..."
        rows={1}
        disabled={disabled}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          e.target.style.height = 'auto'
          e.target.style.height = `${e.target.scrollHeight}px`
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
          }
        }}
      />
      <span onClick={handleSubmit}>
        <Button
          size="sm"
          color="primary"
          iconLeading={Send03}
          isDisabled={disabled || !text.trim()}
        >
          Send
        </Button>
      </span>
    </div>
  )
}
