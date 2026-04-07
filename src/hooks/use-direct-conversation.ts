'use client'

import { useEffect, useRef, useState } from 'react'
import { getOrCreateDirectConversation } from '@/lib/chat'

interface UseDirectConversationResult {
  conversationId: string | null
  loading: boolean
  error: string | null
}

// Module-level cache: agentParticipantId -> conversationId
const conversationCache = new Map<string, string>()

export function useDirectConversation(
  agentParticipantId: string | null
): UseDirectConversationResult {
  const [conversationId, setConversationId] = useState<string | null>(
    agentParticipantId ? conversationCache.get(agentParticipantId) ?? null : null
  )
  const [loading, setLoading] = useState(!conversationId && !!agentParticipantId)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!agentParticipantId) return

    // Return cached immediately
    const cached = conversationCache.get(agentParticipantId)
    if (cached) {
      setConversationId(cached)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getOrCreateDirectConversation(agentParticipantId)
      .then((id) => {
        if (!cancelled && mountedRef.current) {
          conversationCache.set(agentParticipantId, id)
          setConversationId(id)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled && mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to resolve conversation')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [agentParticipantId])

  return { conversationId, loading, error }
}
