'use client'

import { useState, useCallback } from 'react'
import { useBuilderStore } from '../stores/builder-store'
import type { OfficeMapDocument } from '@/features/office/types'

interface SaveResult {
  versionId: string
  versionNum: number
  isDraft: boolean
}

export function useBuilderSave() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveDraft = useCallback(async (mapJson: OfficeMapDocument | null): Promise<SaveResult | null> => {
    // Handle null mapJson (builder not ready)
    if (!mapJson) {
      setError('Builder not ready')
      return null
    }

    const { mapId } = useBuilderStore.getState()
    if (!mapId) { setError('No map ID'); return null }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/office/maps/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId, mapJson, isDraft: true }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Save failed')
      }
      const result: SaveResult = await res.json()
      useBuilderStore.getState().markClean()
      useBuilderStore.getState().setCurrentVersionNum(result.versionNum)
      return result
    } catch (err) {
      setError(String(err))
      return null
    } finally {
      setSaving(false)
    }
  }, [])

  const publish = useCallback(async (mapJson: OfficeMapDocument | null): Promise<SaveResult | null> => {
    // Handle null mapJson (builder not ready)
    if (!mapJson) {
      setError('Builder not ready')
      return null
    }

    const { mapId } = useBuilderStore.getState()
    if (!mapId) { setError('No map ID'); return null }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/office/maps/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId, mapJson, isDraft: false }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Publish failed')
      }
      const result: SaveResult = await res.json()
      useBuilderStore.getState().markClean()
      useBuilderStore.getState().setCurrentVersionNum(result.versionNum)
      return result
    } catch (err) {
      setError(String(err))
      return null
    } finally {
      setSaving(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { saveDraft, publish, saving, error, clearError }
}
