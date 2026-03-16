'use client'

import { useState, useRef, useEffect } from 'react'
import type { CardRow, CardType } from '@/types/workflow'

interface InlineCardCreateProps {
  workflowId: string
  stateId: string
  defaultCardType: CardType
  onCardCreated: (card: CardRow) => void
  onCancel: () => void
}

export function InlineCardCreate({
  workflowId,
  stateId,
  defaultCardType,
  onCardCreated,
  onCancel,
}: InlineCardCreateProps) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const handleSubmit = async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmed,
          workflow_id: workflowId,
          state_id: stateId,
          card_type: defaultCardType,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Failed to create card (${res.status})`)
      }

      const newCard = (await res.json()) as CardRow
      onCardCreated(newCard)
      setTitle('')
      inputRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create card')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        marginTop: '4px',
        padding: '6px 8px',
        background: 'var(--surface)',
        border: '1px solid var(--accent, #6366f1)',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Card title..."
        disabled={isSubmitting}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: 'var(--text-primary)',
          width: '100%',
          padding: '2px 0',
        }}
      />
      {error && (
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            color: 'var(--error, #ef4444)',
          }}
        >
          {error}
        </span>
      )}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
          marginTop: '2px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            opacity: 0.6,
          }}
        >
          Enter to create · Esc to cancel
        </span>
      </div>
    </div>
  )
}
