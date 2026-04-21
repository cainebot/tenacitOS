'use client'

import { useCallback, useEffect, useState } from 'react'
import type { IdentityFileType } from '@/types/agents'

export interface UseAgentIdentityResult {
  content: string
  stagedContent: string
  setStagedContent: (value: string) => void
  updatedAt: string | null
  isDirty: boolean
  loading: boolean
  saving: boolean
  error: string | null
  save: () => Promise<void>
  refetch: () => Promise<void>
}

export function useAgentIdentity(id: string, fileType: IdentityFileType): UseAgentIdentityResult {
  const [content, setContent] = useState<string>('')
  const [stagedContent, setStagedContent] = useState<string>('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Computed: isDirty tracks whether staged content differs from saved content
  const isDirty = stagedContent !== content

  const fetchIdentity = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/agents/${id}/identity/${fileType}`)
      if (!response.ok) {
        setError(`Failed to fetch identity file: ${response.statusText}`)
        return
      }
      const data: { content: string; updatedAt: string | null } = await response.json()
      setContent(data.content)
      setStagedContent(data.content)
      setUpdatedAt(data.updatedAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch identity file')
    } finally {
      setLoading(false)
    }
  }, [id, fileType])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/agents/${id}/identity/${fileType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: stagedContent }),
      })
      if (!response.ok) {
        const data = await response.json()
        setError(data.error ?? `Failed to save identity file: ${response.statusText}`)
        return
      }
      const data: { success: boolean; updatedAt: string } = await response.json()
      // On success, sync saved content to staged content
      setContent(stagedContent)
      setUpdatedAt(data.updatedAt)
      // soul_dirty is set by the API route, NOT in the hook
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save identity file')
    } finally {
      setSaving(false)
    }
  }, [id, fileType, stagedContent])

  useEffect(() => {
    fetchIdentity()
  }, [fetchIdentity])

  return {
    content,
    stagedContent,
    setStagedContent,
    updatedAt,
    isDirty,
    loading,
    saving,
    error,
    save,
    refetch: fetchIdentity,
  }
}
