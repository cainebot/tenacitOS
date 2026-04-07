'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createBrowserClient } from '@/lib/supabase'
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
    const supabase = createBrowserClient()
    let cancelled = false

    async function fetchParticipant() {
      // Per D-02: auth.uid() IS participant_id (Phase 88 seed uses Auth UUID)
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) {
        if (!cancelled) {
          setError('Not authenticated')
          setLoading(false)
        }
        return
      }

      const { data, error: fetchErr } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('participant_id', user.id)
        .single()

      if (!cancelled) {
        if (fetchErr) {
          setError(fetchErr.message)
        } else {
          setParticipant(data as ChatParticipantRow)
        }
        setLoading(false)
      }
    }

    fetchParticipant()
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
