'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ChatParticipantRow } from '@/types/chat'

interface MyParticipantContextValue {
  participant: ChatParticipantRow | null
  loading: boolean
  error: string | null
}

const MyParticipantContext = createContext<MyParticipantContextValue>({
  participant: null,
  loading: true,
  error: null,
})

export function MyParticipantProvider({ children }: { children: ReactNode }) {
  const [participant, setParticipant] = useState<ChatParticipantRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    // Fetch Joan's participant via API (service_role bypasses RLS,
    // middleware mc_auth cookie already verifies authentication)
    fetch('/api/my-participant')
      .then((res) => {
        if (!res.ok) throw new Error('Participant not found')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setParticipant(data as ChatParticipantRow)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  return (
    <MyParticipantContext.Provider value={{ participant, loading, error }}>
      {children}
    </MyParticipantContext.Provider>
  )
}

export function useMyParticipant(): MyParticipantContextValue {
  return useContext(MyParticipantContext)
}
