'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { CardDetail, CustomFieldDefinitionRow } from '@/types/project'
import { useBoardStore } from '@/stores/board-store'

interface UseCardDetailReturn {
  card: CardDetail | null
  fieldDefs: CustomFieldDefinitionRow[]
  loading: boolean
  error: string | null
  updateField: (field: string, value: unknown) => Promise<void>
  updateCustomField: (fieldId: string, value: unknown) => Promise<void>
  moveCard: (stateId: string) => Promise<void>
  deleteCard: () => Promise<void>
  reorderField: (fieldId: string, newPosition: number, type: 'core' | 'custom') => Promise<void>
  refetch: () => Promise<void>
  appendComment: (author: string, text: string) => void
}

export function useCardDetail(cardId: string | null): UseCardDetailReturn {
  const [card, setCard] = useState<CardDetail | null>(null)
  const [fieldDefs, setFieldDefs] = useState<CustomFieldDefinitionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track in-flight field updates to implement last-write-wins
  const updateTimestamps = useRef<Record<string, number>>({})

  const fetchCard = useCallback(async (id: string, silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cards/${id}`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const msg = body?.message || res.statusText
        throw new Error(`Failed to fetch card: ${msg}`)
      }
      const data: CardDetail = await res.json()
      setCard(data)

      // Fetch field definitions in parallel using the card's project and type
      const fieldsRes = await fetch(
        `/api/projects/${data.project_id}/fields?card_type=${data.card_type}`
      )
      if (fieldsRes.ok) {
        const defs: CustomFieldDefinitionRow[] = await fieldsRes.json()
        setFieldDefs(defs)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (cardId) {
      fetchCard(cardId)
    } else {
      setCard(null)
      setFieldDefs([])
      setError(null)
    }
  }, [cardId, fetchCard])

  // Subscribe to board store — sync non-positional field changes (from patchCardInStore or
  // Realtime updates that patched the store) into local detail state without a refetch.
  // Uses .subscribe() (imperative) not useBoardStore() (reactive) to avoid coupling render cycles.
  useEffect(() => {
    if (!cardId) return

    const unsub = useBoardStore.subscribe((state) => {
      // Find this card in the board store columns
      for (const col of state.columns) {
        const storeCard = col.items.find(c => c.card_id === cardId)
        if (storeCard) {
          setCard(prev => {
            if (!prev) return prev
            // Equality check — avoid unnecessary re-renders and infinite loops
            if (
              prev.title === storeCard.title &&
              prev.priority === storeCard.priority &&
              prev.assigned_agent_id === storeCard.assigned_agent_id &&
              prev.due_date === storeCard.due_date &&
              JSON.stringify(prev.labels) === JSON.stringify(storeCard.labels) &&
              prev.description === storeCard.description
            ) {
              return prev // no change
            }
            return {
              ...prev,
              title: storeCard.title,
              priority: storeCard.priority,
              assigned_agent_id: storeCard.assigned_agent_id,
              due_date: storeCard.due_date,
              labels: storeCard.labels,
              description: storeCard.description ?? prev.description,
            }
          })
          return
        }
      }
    })

    return unsub
  }, [cardId])

  const refetch = useCallback(async () => {
    if (cardId) {
      await fetchCard(cardId, true)
    }
  }, [cardId, fetchCard])

  const updateField = useCallback(
    async (field: string, value: unknown) => {
      if (!card) return

      const callId = Date.now()
      updateTimestamps.current[field] = callId

      // Optimistic update
      setCard((prev) => (prev ? { ...prev, [field]: value } : prev))

      try {
        const res = await fetch(`/api/cards/${card.card_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        })
        if (!res.ok) {
          throw new Error(`Failed to update field: ${res.statusText}`)
        }
      } catch (err) {
        // Only revert if this is still the latest update for this field
        if (updateTimestamps.current[field] === callId) {
          console.error(`Failed to update field ${field}:`, err)
          // Revert by refetching
          await fetchCard(card.card_id)
        }
      }
    },
    [card, fetchCard]
  )

  const updateCustomField = useCallback(
    async (fieldId: string, value: unknown) => {
      if (!card) return

      const callId = Date.now()
      const key = `custom_${fieldId}`
      updateTimestamps.current[key] = callId

      // Optimistic update
      setCard((prev) => {
        if (!prev) return prev
        const existingIndex = prev.field_values.findIndex((fv) => fv.field_id === fieldId)
        let newFieldValues
        if (existingIndex >= 0) {
          newFieldValues = prev.field_values.map((fv) =>
            fv.field_id === fieldId ? { ...fv, value } : fv
          )
        } else {
          newFieldValues = [...prev.field_values, { card_id: prev.card_id, field_id: fieldId, value }]
        }
        return { ...prev, field_values: newFieldValues }
      })

      try {
        const res = await fetch(`/api/cards/${card.card_id}/field-values`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [{ field_id: fieldId, value }] }),
        })
        if (!res.ok) {
          throw new Error(`Failed to update custom field: ${res.statusText}`)
        }
      } catch (err) {
        if (updateTimestamps.current[key] === callId) {
          console.error(`Failed to update custom field ${fieldId}:`, err)
          await fetchCard(card.card_id)
        }
      }
    },
    [card, fetchCard]
  )

  const moveCard = useCallback(
    async (stateId: string) => {
      if (!card) return

      // Optimistic update
      setCard((prev) => (prev ? { ...prev, state_id: stateId } : prev))

      try {
        const res = await fetch(`/api/cards/${card.card_id}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state_id: stateId, moved_by: 'user' }),
        })
        if (!res.ok) {
          throw new Error(`Failed to move card: ${res.statusText}`)
        }
      } catch (err) {
        console.error('Failed to move card:', err)
        await fetchCard(card.card_id)
      }
    },
    [card, fetchCard]
  )

  const deleteCard = useCallback(async () => {
    if (!card) return

    const res = await fetch(`/api/cards/${card.card_id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      throw new Error(`Failed to delete card: ${res.statusText}`)
    }
  }, [card])

  const reorderField = useCallback(
    async (fieldId: string, newPosition: number, type: 'core' | 'custom') => {
      if (!card) return

      if (type === 'custom') {
        // Update position via API
        const fieldDef = fieldDefs.find((f) => f.field_id === fieldId)
        if (!fieldDef) return

        // Optimistically reorder in local state
        setFieldDefs((prev) => {
          const sorted = [...prev].sort((a, b) => a.position - b.position)
          const idx = sorted.findIndex((f) => f.field_id === fieldId)
          if (idx < 0) return prev
          const [moved] = sorted.splice(idx, 1)
          sorted.splice(newPosition, 0, moved)
          return sorted.map((f, i) => ({ ...f, position: i }))
        })

        try {
          const res = await fetch(`/api/projects/${fieldDef.project_id}/fields/${fieldId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: newPosition }),
          })
          if (!res.ok) {
            throw new Error(`Failed to reorder field: ${res.statusText}`)
          }
        } catch (err) {
          console.error('Failed to reorder custom field:', err)
          await fetchCard(card.card_id)
        }
      } else {
        // Core field order — stored in localStorage
        const storageKey = `card-field-order-${card.project_id}`
        const defaultOrder = ['card_type', 'priority', 'assigned_agent_id', 'due_date', 'labels']
        const stored = localStorage.getItem(storageKey)
        const currentOrder: string[] = stored ? JSON.parse(stored) : defaultOrder

        const idx = currentOrder.indexOf(fieldId)
        if (idx < 0) return

        const newOrder = [...currentOrder]
        newOrder.splice(idx, 1)
        newOrder.splice(newPosition, 0, fieldId)
        localStorage.setItem(storageKey, JSON.stringify(newOrder))
      }
    },
    [card, fieldDefs, fetchCard]
  )

  const appendComment = useCallback((author: string, text: string) => {
    setCard(prev => {
      if (!prev) return prev
      const optimistic: CardDetail['comments'][number] = {
        comment_id: `optimistic-${Date.now()}`,
        card_id: prev.card_id,
        author,
        text,
        created_at: new Date().toISOString(),
      }
      return { ...prev, comments: [...prev.comments, optimistic] }
    })
  }, [])

  return {
    card,
    fieldDefs,
    loading,
    error,
    updateField,
    updateCustomField,
    moveCard,
    deleteCard,
    reorderField,
    refetch,
    appendComment,
  }
}
