'use client'

import { useState, useCallback } from 'react'
import { Button, Input, Select, cx } from '@circos/ui'
import { Plus } from '@untitledui/icons'
import type { StateCategory } from '@/types/project'

interface StateCreateInlineProps {
  onCreateState: (data: {
    name: string
    category: StateCategory
    color?: string
  }) => Promise<unknown>
}

const CATEGORY_OPTIONS = [
  { id: 'to-do' as const, label: 'To Do' },
  { id: 'in_progress' as const, label: 'In Progress' },
  { id: 'done' as const, label: 'Done' },
]

export function StateCreateInline({ onCreateState }: StateCreateInlineProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<StateCategory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !category) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onCreateState({ name: name.trim(), category, color: '#667085' })
      // On success: reset name and category, keep form expanded for rapid creation
      setName('')
      setCategory(null)
    } catch {
      setError('Failed to create state. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [name, category, onCreateState])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit()
      } else if (e.key === 'Escape') {
        setIsExpanded(false)
        setName('')
        setCategory(null)
      }
    },
    [handleSubmit]
  )

  const handleCancel = useCallback(() => {
    setIsExpanded(false)
    setName('')
    setCategory(null)
  }, [])

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className={cx(
          'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-tertiary',
          'hover:bg-primary_hover transition-colors'
        )}
      >
        <Plus className="size-4" />
        <span>New state</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      <Input
        size="sm"
        placeholder="State name"
        value={name}
        onChange={(v) => setName(v)}
        onKeyDown={handleKeyDown}
        autoFocus
        isDisabled={isSubmitting}
      />
      <Select
        size="sm"
        placeholder="Select category"
        selectedKey={category}
        onSelectionChange={(key) => setCategory(key as StateCategory)}
        items={CATEGORY_OPTIONS}
        isDisabled={isSubmitting}
      >
        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
      </Select>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          color="secondary"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          showTextWhileLoading
          isDisabled={!name.trim() || !category}
        >
          Add state
        </Button>
        <Button
          size="sm"
          color="tertiary"
          onClick={handleCancel}
          isDisabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
      {error && <p className="text-sm text-error-primary mt-1">{error}</p>}
    </div>
  )
}
