'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Select,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ConfirmActionDialog,
} from '@circos/ui'
import { createBrowserClient } from '@/lib/supabase'
import type { ProjectStateRow } from '@/types/project'

interface DeleteStateModalProps {
  state: ProjectStateRow | null // null = modal closed
  states: ProjectStateRow[] // all states (to build target selector)
  onDeleteState: (stateId: string, targetStateId?: string) => Promise<boolean>
  onClose: () => void
}

export function DeleteStateModal({
  state,
  states,
  onDeleteState,
  onClose,
}: DeleteStateModalProps) {
  const [cardCount, setCardCount] = useState<number | null>(null) // null = not yet fetched
  const [isFetchingCount, setIsFetchingCount] = useState(false)
  const [targetStateId, setTargetStateId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch card count on-demand when modal opens (per D-13)
  useEffect(() => {
    if (!state) {
      // Reset all state when modal closes
      setCardCount(null)
      setIsFetchingCount(false)
      setTargetStateId(null)
      setIsDeleting(false)
      setError(null)
      return
    }

    let cancelled = false

    async function fetchCount() {
      if (!state) return
      setIsFetchingCount(true)
      setError(null)
      try {
        const supabase = createBrowserClient()
        const { count, error: queryError } = await supabase
          .from('cards')
          .select('*', { count: 'exact', head: true })
          .eq('state_id', state.state_id)
        if (cancelled) return
        if (queryError) throw queryError
        setCardCount(count ?? 0)
      } catch {
        if (cancelled) return
        setError('Failed to check card count. Please try again.')
        setCardCount(0) // Fallback to 0-card path
      } finally {
        if (!cancelled) setIsFetchingCount(false)
      }
    }

    fetchCount()
    return () => {
      cancelled = true
    }
  }, [state])

  // 0-card path: simple confirm
  const handleConfirmDelete = useCallback(async () => {
    if (!state) return
    setIsDeleting(true)
    setError(null)
    const success = await onDeleteState(state.state_id)
    setIsDeleting(false)
    if (success) onClose()
    else setError('Failed to delete state. Please try again.')
  }, [state, onDeleteState, onClose])

  // N-card path: reassign and delete
  const handleReassignDelete = useCallback(async () => {
    if (!state || !targetStateId) return
    setIsDeleting(true)
    setError(null)
    const success = await onDeleteState(state.state_id, targetStateId)
    setIsDeleting(false)
    if (success) onClose()
    else setError('Failed to delete state. Please try again.')
  }, [state, targetStateId, onDeleteState, onClose])

  // Available target states — exclude the state being deleted
  const targetStates = states.filter(
    (s) => state && s.state_id !== state.state_id
  )

  // Loading state — fetching card count
  if (state && isFetchingCount) {
    return (
      <Modal
        isOpen={!!state && isFetchingCount}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      >
        <div>
          <ModalHeader>{`Delete state "${state?.name}"?`}</ModalHeader>
          <ModalBody>
            <div className="flex items-center justify-center py-8">
              <div className="size-6 animate-spin rounded-full border-2 border-secondary border-t-brand-solid" />
            </div>
          </ModalBody>
        </div>
      </Modal>
    )
  }

  // 0-card path — simple ConfirmActionDialog
  if (state && cardCount === 0 && !isFetchingCount) {
    return (
      <ConfirmActionDialog
        open={!!state && cardCount === 0 && !isFetchingCount}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        title={`Delete state "${state?.name}"?`}
        description="This state has no cards. This action cannot be undone."
        confirmLabel="Delete state"
        confirmingLabel="Deleting..."
        onConfirm={handleConfirmDelete}
        isConfirming={isDeleting}
        errorMessage={error}
      />
    )
  }

  // N-card path — custom modal with reassignment selector
  if (state && cardCount !== null && cardCount > 0 && !isFetchingCount) {
    return (
      <Modal
        isOpen={!!state && cardCount > 0 && !isFetchingCount}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      >
        <div>
          <ModalHeader>{`Delete state "${state?.name}"?`}</ModalHeader>
          <ModalBody>
            <p className="text-sm text-secondary mb-4">
              There are {cardCount} cards with this state.
            </p>
            <Select
              label="Move cards to"
              placeholder="Select a state"
              selectedKey={targetStateId}
              onSelectionChange={(key) => setTargetStateId(key as string)}
              items={targetStates.map((s) => ({
                id: s.state_id,
                label: s.name,
              }))}
              isDisabled={isDeleting}
              size="sm"
            >
              {(item) => (
                <Select.Item id={item.id}>{item.label}</Select.Item>
              )}
            </Select>
            <p className="mt-3 text-sm text-warning-primary">
              This action cannot be undone.
            </p>
            {error && (
              <p className="mt-2 text-sm text-error-primary">{error}</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              color="secondary"
              onClick={onClose}
              isDisabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              color="primary-destructive"
              isDisabled={!targetStateId || isDeleting}
              isLoading={isDeleting}
              showTextWhileLoading
              onClick={handleReassignDelete}
            >
              Delete and reassign {cardCount} cards
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    )
  }

  // Modal closed (state is null) — render nothing
  return null
}
